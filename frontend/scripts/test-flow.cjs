/* 端到端：真实 pinia store 上模拟完整整改-复查流程 */
const esbuild = require('esbuild')
const path = require('path')

const mem = new Map()
global.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k)
}

function load(tsPath) {
  const out = esbuild.buildSync({
    entryPoints: [path.resolve(__dirname, tsPath)],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    external: ['pinia', 'vue']
  })
  const module = { exports: {} }
  const customRequire = (id) => {
    if (id === 'pinia') return require('pinia')
    if (id === 'vue') return require('vue')
    return require(id)
  }
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(module, module.exports, customRequire)
  return module.exports
}

const { createPinia, setActivePinia } = require('pinia')
const hazardMod = load('../src/store/modules/hazard.ts')
const { useHazardStore } = hazardMod

setActivePinia(createPinia())
const store = useHazardStore()

const operator = { username: 'operator', realName: '现场操作员', roleKey: 'f', roleName: '提交人', canReview: false, isAdmin: false }
const hse = { username: 'hse', realName: 'HSE审核员', roleKey: 'r', roleName: '复查员', canReview: true, isAdmin: false }
const admin = { username: 'admin', realName: '管理员', roleKey: 'a', roleName: '管理员', canReview: false, isAdmin: true }

let pass = 0
let fail = 0
const assert = (cond, name) => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name) }
}

store.resetSeed()
const initialStats = { ...store.stats }
console.log('初始统计:', initialStats)
assert(initialStats.riskCount === 5, '种子数据未闭环风险=5（6 项中 1 项已闭环）')

// 取 HZ-2024001（待整改）
const h = store.getById(1)
assert(h.status === '待整改', 'HZ-2024001 初始为待整改')

// 1. 提交人无附件提交 -> 拒绝，状态不变
let g = store.guardSubmit(1, operator, { opinion: '改了', attachments: [], mode: '提交整改' }, false)
assert(!g.ok && h.status === '待整改', '无附件提交被拒，状态保持待整改')

// 2. 越权：其他提交人/管理员/复查员提交 -> 拒绝
g = store.guardSubmit(1, { ...operator, username: 'x' }, { opinion: 'a', attachments: [{ id: 1 }], mode: '提交整改' }, false)
assert(!g.ok, '非归属人提交被拒')
g = store.guardSubmit(1, admin, { opinion: 'a', attachments: [{ id: 1 }], mode: '提交整改' }, true)
assert(!g.ok, '管理员提交被拒')
g = store.guardSubmit(1, hse, { opinion: 'a', attachments: [{ id: 1 }], mode: '提交整改' }, false)
assert(!g.ok, '复查员提交被拒')

const recordsBefore = h.records.length

// 3. 归属提交人带附件提交整改 -> 待复查，记录追加
store.submitRectification(1, operator, {
  opinion: '已更换消防器材',
  attachments: [{ id: 901, name: '整改照片.jpg', size: 1, uploader: '现场操作员', uploadTime: 't' }],
  mode: '提交整改'
})
assert(store.getById(1).status === '待复查', '提交整改后状态=待复查')
assert(store.getById(1).records.length === recordsBefore + 1, '处理记录追加一条（未覆盖历史）')
assert(store.stats.pendingReview === initialStats.pendingReview + 1, '统计：待复查 +1')
assert(store.stats.pendingRectify === initialStats.pendingRectify - 1, '统计：待整改 -1')
assert(store.stats.riskCount === initialStats.riskCount, '未闭环总数不变')

// 4. 提交人/管理员尝试复查 -> 拒绝，状态仍是待复查
g = store.guardReview(1, operator)
assert(!g.ok && store.getById(1).status === '待复查', '提交人复查被拒，状态不变')
g = store.guardReview(1, admin)
assert(!g.ok, '管理员复查被拒')

// 5. HSE 复查不通过 -> 待重新整改，历史意见仍在
store.submitReview(1, hse, '不通过', '器材型号不符合规范，退回')
assert(store.getById(1).status === '待重新整改', '复查不通过 -> 待重新整改')
const recsAfterReject = store.getById(1).records
assert(recsAfterReject.some((x) => x.action === '提交整改'), '历史提交整改意见保留')
assert(recsAfterReject.some((x) => x.action === '复查不通过' && x.opinion.includes('型号')), '复查不通过意见已留痕')

// 6. 重复复查被拒（当前待重新整改）
g = store.guardReview(1, hse)
assert(!g.ok && g.reasons.some((r) => r.includes('尚未提交复查申请')), '退回态重复复查被拒')

// 7. 提交人重新整改并提交 -> 待复查
store.submitRectification(1, operator, {
  opinion: '已更换为合规型号',
  attachments: [{ id: 902, name: '合格证明.pdf', size: 2, uploader: '现场操作员', uploadTime: 't' }],
  mode: '提交整改'
})
assert(store.getById(1).status === '待复查', '重新整改提交后=待复查')

// 8. HSE 复查通过 -> 已闭环；全部历史意见都在（登记/提交/复查/重改/再提交/通过）
store.submitReview(1, hse, '通过', '型号合格，同意闭环')
const final = store.getById(1)
assert(final.status === '已闭环', '复查通过 -> 已闭环')
const actions = final.records.map((x) => x.action)
assert(JSON.stringify(actions) === JSON.stringify(['登记', '提交整改', '复查不通过', '提交整改', '复查通过']),
  '完整处理链 5 条意见齐全且顺序正确、无覆盖')
assert(store.stats.closedCount === initialStats.closedCount + 1, '统计：已闭环 +1')
assert(store.stats.riskCount === initialStats.riskCount - 1, '统计：未闭环 -1（状态与统计同步）')

// 9. 已闭环重复复查 -> 拒绝，旧结论不被覆盖
g = store.guardReview(1, hse)
assert(!g.ok && g.reasons.some((r) => r.includes('不能重复复查')), '已闭环后重复复查被拒')
assert(store.getById(1).records.length === 5, '重复复查未写入新记录')

// 10. 持久化：另一个 store 实例读到同一份数据（模拟从记录页返回列表）
setActivePinia(createPinia())
const store2 = useHazardStore()
const reopened = store2.getById(1)
assert(reopened.status === '已闭环', '新 store 实例（列表页）读到最新状态=已闭环')
assert(reopened.records.length === 5, '历史 5 条意见在新实例中仍完整')
assert(store2.stats.closedCount === store.stats.closedCount, '列表页与处理页统计一致（同源）')

console.log(`\n端到端结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
