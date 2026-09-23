/* 守卫逻辑单元测试（node + esbuild 转译，无需浏览器） */
const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

// ---- localStorage 桩 ----
const mem = new Map()
global.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k)
}

const src = path.resolve(__dirname, '../src/store/modules/hazard.ts')
const bundled = esbuild.buildSync({
  entryPoints: [src],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false
})
const mod = { exports: {} }
new Function('module', 'exports', 'require', bundled.outputFiles[0].text)(mod, mod.exports, require)

const {
  checkReviewGuard,
  checkSubmitGuard,
  calcStats,
  useHazardStore,
  ownershipOf
} = mod.exports

// pinia 在 node 下未激活时，setup store 无法直接调用；改为直接校验纯函数 + 手工种子。
// 这里通过解析种子生成逻辑较麻烦，改为构造与种子等价的内存隐患集合。
let rid = 1
const rec = (action, attachments = [], overrides = {}) => ({
  id: rid++,
  action,
  operator: '现场操作员',
  operatorRole: '提交人',
  opinion: action + '意见',
  attachments,
  time: '2024-01-01 10:00:00',
  ...overrides
})
const att = (name) => ({ id: rid++, name, size: 1024, uploader: 'x', uploadTime: 't' })

const operator = { username: 'operator', realName: '现场操作员', roleKey: 'f', roleName: '提交人', canReview: false, isAdmin: false }
const hse = { username: 'hse', realName: 'HSE审核员', roleKey: 'r', roleName: '复查员', canReview: true, isAdmin: false }
const admin = { username: 'admin', realName: '管理员', roleKey: 'a', roleName: '管理员', canReview: false, isAdmin: true }
// 被误配成复查员的提交人（验证职责分离）
const operatorWithReview = { ...operator, canReview: true }

const makeHazard = (over = {}) => ({
  id: 1,
  hazardCode: 'HZ-001',
  hazardDesc: 'd',
  location: 'A井场',
  level: '高',
  status: '待复查',
  foundDate: '2024-01-01',
  reporter: 'operator',
  reporterName: '现场操作员',
  records: [rec('登记', []), rec('提交整改', [att('a.jpg')])],
  ...over
})

let pass = 0
let fail = 0
const assert = (cond, name) => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name) }
}
const reasonsOf = (r) => r.reasons.join(' | ')

console.log('复查守卫 checkReviewGuard:')

// 1. 正常复查通过
let r = checkReviewGuard(makeHazard(), hse)
assert(r.ok, 'HSE复查员对待复查+有附件隐患可复查')

// 2. 提交人不能复查（越权）
r = checkReviewGuard(makeHazard(), operator)
assert(!r.ok && r.reasons.some((x) => x.includes('不具备复查权限')), '提交人复查被拒（越权）')
assert(r.reasons.some((x) => x.includes('【隐患归属】') && x.includes('HZ-001')), '拒绝信息指出隐患编号与归属')

// 3. 管理员不能复查
r = checkReviewGuard(makeHazard(), admin)
assert(!r.ok && r.reasons.some((x) => x.includes('管理员')), '管理员复查被拒（仅受控汇总）')

// 4. 无附件拒绝
r = checkReviewGuard(makeHazard({ records: [rec('登记'), rec('提交整改', [])] }), hse)
assert(!r.ok && r.reasons.some((x) => x.includes('未上传任何附件')), '无附件复查被拒')

// 5. 重复复查：已闭环
r = checkReviewGuard(makeHazard({ status: '已闭环' }), hse)
assert(!r.ok && r.reasons.some((x) => x.includes('已') && x.includes('闭环')), '已闭环隐患重复复查被拒')

// 6. 重复复查：待整改/待重新整改（尚未申请复查）
r = checkReviewGuard(makeHazard({ status: '待整改' }), hse)
assert(!r.ok && r.reasons.some((x) => x.includes('尚未提交复查申请')), '待整改状态复查被拒')
r = checkReviewGuard(makeHazard({ status: '待重新整改' }), hse)
assert(!r.ok, '待重新整改状态复查被拒')

// 7. 职责分离：本人不能复查自己的隐患（即使有权限）
r = checkReviewGuard(makeHazard({ reporter: 'operator' }), operatorWithReview)
assert(!r.ok && r.reasons.some((x) => x.includes('不能为同一账号')), '提交人复查本人隐患被拒（职责分离）')

// 8. 旧无附件材料场景：已有历史复查意见但材料无附件，仍拒绝
r = checkReviewGuard(
  makeHazard({
    records: [
      rec('登记'),
      rec('提交整改', [], { opinion: '口头' }),
      rec('复查不通过', [], { operator: 'HSE审核员' })
    ]
  }),
  hse
)
assert(!r.ok, '最新材料无附件时复查被拒（旧结果不残留放行）')

// 9. 补充材料带附件后可复查（旧的无附件提交整改被新材料覆盖判定）
r = checkReviewGuard(
  makeHazard({
    records: [rec('登记'), rec('提交整改', []), rec('补充材料', [att('补充.jpg')])]
  }),
  hse
)
assert(r.ok, '补充附件后可复查')

console.log('提交守卫 checkSubmitGuard:')

const payloadOk = { opinion: '已整改', attachments: [att('x.jpg')], mode: '提交整改' }

// 10. 归属人提交整改
r = checkSubmitGuard(makeHazard({ status: '待整改' }), operator, payloadOk, false)
assert(r.ok, '归属提交人可提交整改')

// 11. 非归属提交人
const other = { ...operator, username: 'operator2', realName: '张三' }
r = checkSubmitGuard(makeHazard({ status: '待整改' }), other, payloadOk, false)
assert(!r.ok && r.reasons.some((x) => x.includes('无权代为提交')), '非归属人提交被拒并指出归属')

// 12. 管理员不能提交
r = checkSubmitGuard(makeHazard({ status: '待整改' }), admin, payloadOk, true)
assert(!r.ok && r.reasons.some((x) => x.includes('管理员')), '管理员提交整改被拒')

// 13. 复查员不能替提交人提交
r = checkSubmitGuard(makeHazard({ status: '待整改' }), hse, payloadOk, false)
assert(!r.ok && r.reasons.some((x) => x.includes('复查账号仅可执行复查')), '复查账号不能提交整改')

// 14. 无附件不能提交
r = checkSubmitGuard(makeHazard({ status: '待整改' }), operator, { ...payloadOk, attachments: [] }, false)
assert(!r.ok && r.reasons.some((x) => x.includes('至少上传一个')), '提交整改无附件被拒')

// 15. 待复查只能补充材料，不能重复提交整改
r = checkSubmitGuard(makeHazard({ status: '待复查' }), operator, payloadOk, false)
assert(!r.ok, '待复查状态重复提交整改被拒')
r = checkSubmitGuard(
  makeHazard({ status: '待复查' }),
  operator,
  { opinion: '补充', attachments: [att('b.jpg')], mode: '补充材料' },
  false
)
assert(r.ok, '待复查状态可补充材料')

// 16. 非待复查不能补充材料
r = checkSubmitGuard(
  makeHazard({ status: '待整改' }),
  operator,
  { opinion: '补充', attachments: [att('b.jpg')], mode: '补充材料' },
  false
)
assert(!r.ok, '待整改状态不能补充材料')

// 17. 退回重改后可再次提交整改
r = checkSubmitGuard(makeHazard({ status: '待重新整改' }), operator, payloadOk, false)
assert(r.ok, '退回重改后可重新提交整改')

console.log('统计与状态同源 calcStats:')
const list = [
  makeHazard({ status: '待整改', level: '高' }),
  makeHazard({ id: 2, hazardCode: 'HZ-002', status: '待复查', level: '中' }),
  makeHazard({ id: 3, hazardCode: 'HZ-003', status: '已闭环', level: '高' }),
  makeHazard({ id: 4, hazardCode: 'HZ-004', status: '待重新整改', level: '低' })
]
const s = calcStats(list)
assert(s.riskCount === 3, '未闭环风险=3（已闭环不计入）')
assert(s.highRisk === 1 && s.mediumRisk === 1 && s.lowRisk === 1, '等级统计正确（闭环高风险不计入）')
assert(s.closedCount === 1 && s.pendingRectify === 1 && s.pendingReview === 1 && s.reRectify === 1, '各状态计数正确')

console.log('归属信息 ownershipOf:')
assert(ownershipOf(makeHazard()).includes('现场操作员（operator）'), '归属文本含责任人姓名与账号')

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
