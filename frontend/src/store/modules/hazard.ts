import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Attachment,
  CurrentUser,
  Hazard,
  HazardRecord,
  HazardStatus
} from '@/types/hazard'

const STORAGE_KEY = 'hazard_data_v1'

/** 复查 / 提交前校验结果：ok 为 false 时 reasons 列出全部拒绝原因（含隐患归属） */
export interface GuardResult {
  ok: boolean
  reasons: string[]
}

const now = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let attachmentSeq = 100
let recordSeq = 100

const makeAttachment = (name: string, uploader: string, uploadTime: string): Attachment => ({
  id: attachmentSeq++,
  name,
  size: Math.round(200 + Math.random() * 1800) * 1024,
  uploader,
  uploadTime
})

const makeRecord = (
  action: HazardRecord['action'],
  operator: string,
  operatorRole: string,
  opinion: string,
  attachments: Attachment[] = [],
  time = now()
): HazardRecord => ({
  id: recordSeq++,
  action,
  operator,
  operatorRole,
  opinion,
  attachments,
  time
})

/** 种子数据：覆盖待整改 / 待复查(有附件) / 待复查(旧无附件材料) / 已闭环 / 退回 等场景 */
const seedHazards = (): Hazard[] => [
  {
    id: 1,
    hazardCode: 'HZ-2024001',
    hazardDesc: '井场消防器材过期，需全部更换并登记台账',
    location: 'A井场',
    level: '高',
    status: '待整改',
    foundDate: '2024-01-10',
    reporter: 'operator',
    reporterName: '现场操作员',
    records: [
      makeRecord('登记', '现场操作员', '现场操作员（提交人）', '巡检发现灭火器、消防水带均已过有效期。', [], '2024-01-10 09:20:00')
    ]
  },
  {
    id: 2,
    hazardCode: 'HZ-2024002',
    hazardDesc: '二层平台安全护栏损坏，存在高处坠落风险',
    location: 'B井场',
    level: '中',
    status: '待复查',
    foundDate: '2024-01-12',
    reporter: 'operator',
    reporterName: '现场操作员',
    records: [
      makeRecord('登记', '现场操作员', '现场操作员（提交人）', '护栏约2米段变形脱焊。', [], '2024-01-12 10:00:00'),
      makeRecord(
        '提交整改',
        '现场操作员',
        '现场操作员（提交人）',
        '已重新焊接护栏并做承重测试，附整改照片和测试记录。',
        [
          makeAttachment('护栏整改后照片.jpg', '现场操作员', '2024-01-18 15:30:00'),
          makeAttachment('承重测试记录.pdf', '现场操作员', '2024-01-18 15:31:00')
        ],
        '2024-01-18 15:32:00'
      )
    ]
  },
  {
    id: 3,
    hazardCode: 'HZ-2024003',
    hazardDesc: '配电房电气线路老化，绝缘层开裂',
    location: 'C井场',
    level: '高',
    status: '已闭环',
    foundDate: '2024-01-08',
    reporter: 'operator',
    reporterName: '现场操作员',
    records: [
      makeRecord('登记', '现场操作员', '现场操作员（提交人）', '主电缆绝缘层多处开裂。', [], '2024-01-08 08:40:00'),
      makeRecord(
        '提交整改',
        '现场操作员',
        '现场操作员（提交人）',
        '已更换主电缆并完成绝缘测试。',
        [makeAttachment('电缆更换验收单.pdf', '现场操作员', '2024-01-14 11:00:00')],
        '2024-01-14 11:05:00'
      ),
      makeRecord(
        '复查通过',
        'HSE审核员',
        'HSE复查员',
        '现场复核合格，绝缘电阻符合标准，同意闭环。',
        [],
        '2024-01-15 09:30:00'
      )
    ]
  },
  {
    id: 4,
    hazardCode: 'HZ-2024004',
    hazardDesc: '营地应急照明故障，断电后无法自启',
    location: 'D井场',
    level: '低',
    status: '待重新整改',
    foundDate: '2024-01-15',
    reporter: 'operator',
    reporterName: '现场操作员',
    records: [
      makeRecord('登记', '现场操作员', '现场操作员（提交人）', '3盏应急灯不亮。', [], '2024-01-15 14:00:00'),
      makeRecord(
        '提交整改',
        '现场操作员',
        '现场操作员（提交人）',
        '已更换灯泡。',
        [makeAttachment('更换照片.jpg', '现场操作员', '2024-01-19 10:00:00')],
        '2024-01-19 10:02:00'
      ),
      makeRecord(
        '复查不通过',
        'HSE审核员',
        'HSE复查员',
        '断电测试仍有1盏不能自启，蓄电池需一并更换，退回重新整改。',
        [],
        '2024-01-20 16:20:00'
      )
    ]
  },
  {
    id: 5,
    hazardCode: 'HZ-2024005',
    hazardDesc: '泥浆池防护用品配备不足，缺防化围裙',
    location: 'E井场',
    level: '中',
    status: '待复查',
    foundDate: '2024-01-05',
    reporter: 'operator',
    reporterName: '现场操作员',
    records: [
      makeRecord('登记', '现场操作员', '现场操作员（提交人）', '防化围裙、护目镜数量不足。', [], '2024-01-05 13:00:00'),
      // 历史遗留：提交整改时未附任何材料，复查时必须拒绝
      makeRecord(
        '提交整改',
        '现场操作员',
        '现场操作员（提交人）',
        '口头说明已补齐用品。',
        [],
        '2024-01-21 09:00:00'
      )
    ]
  },
  {
    id: 6,
    hazardCode: 'HZ-2024006',
    hazardDesc: '井口区域硫化氢检测仪未按期标定',
    location: 'A井场',
    level: '高',
    status: '待整改',
    foundDate: '2024-01-22',
    reporter: 'operator',
    reporterName: '现场操作员',
    records: [
      makeRecord('登记', '现场操作员', '现场操作员（提交人）', '检测仪超标定周期30天。', [], '2024-01-22 09:10:00')
    ]
  }
]

const loadHazards = (): Hazard[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Hazard[]
  } catch (e) {
    // 数据损坏时回退种子
  }
  return seedHazards()
}

/** 风险统计：所有页面共用的唯一计算口径，未闭环隐患计入风险 */
export const calcStats = (list: Hazard[]) => {
  const open = list.filter((h) => h.status !== '已闭环')
  return {
    riskCount: open.length,
    highRisk: open.filter((h) => h.level === '高').length,
    mediumRisk: open.filter((h) => h.level === '中').length,
    lowRisk: open.filter((h) => h.level === '低').length,
    closedCount: list.filter((h) => h.status === '已闭环').length,
    pendingRectify: list.filter((h) => h.status === '待整改').length,
    pendingReview: list.filter((h) => h.status === '待复查').length,
    reRectify: list.filter((h) => h.status === '待重新整改').length
  }
}

export const buildLevelDistribution = (s: ReturnType<typeof calcStats>) => [
  { value: s.highRisk, name: '高风险', itemStyle: { color: '#ef4444' } },
  { value: s.mediumRisk, name: '中风险', itemStyle: { color: '#f59e0b' } },
  { value: s.lowRisk, name: '低风险', itemStyle: { color: '#3b82f6' } }
]

/** 隐患归属描述，所有拒绝提示统一附带，便于定位责任人 */
export const ownershipOf = (hazard: Hazard) =>
  `隐患编号：${hazard.hazardCode}；归属提交人：${hazard.reporterName}（${hazard.reporter}）；位置：${hazard.location}；当前状态：${hazard.status}`

/**
 * 复查前置校验（复查弹窗点击“通过/不通过”时执行，全部满足才放行）：
 * 1. 仅具备复查权限的账号可审核；提交人本人、管理员一律拒绝（越权）
 * 2. 隐患必须处于“待复查”，已闭环/已出结论的重复复查拒绝（旧结果不残留覆盖）
 * 3. 待复查的整改/补充材料必须含附件，无附件拒绝
 * 拒绝原因统一附带隐患归属信息。
 */
export const checkReviewGuard = (hazard: Hazard, user: CurrentUser): GuardResult => {
  const reasons: string[] = []

  if (!user.canReview) {
    reasons.push(
      user.isAdmin
        ? '当前账号为管理员，仅可查看受控汇总，不具备复查（审核）权限。'
        : `当前账号「${user.realName}」不具备复查权限。复查仅限具备复查权限的审核账号执行；提交人仅可补充整改材料。`
    )
  }

  // 职责分离：提交人不能审核自己提交的隐患（即便账号被误配权限也拒绝）
  if (user.canReview && hazard.reporter === user.username) {
    reasons.push('提交人与复查人不能为同一账号，禁止对本人提交的隐患进行复查。')
  }

  if (hazard.status !== '待复查') {
    if (hazard.status === '已闭环') {
      reasons.push('该隐患已复查通过并闭环，不能重复复查；如需整改请重新登记隐患。')
    } else if (hazard.status === '待整改' || hazard.status === '待重新整改') {
      reasons.push(`该隐患当前为「${hazard.status}」，提交人尚未提交复查申请，不能复查。`)
    } else {
      reasons.push(`该隐患当前为「${hazard.status}」，不能重复复查。`)
    }
  } else {
    // 仅看待复查态下最新一份整改/补充材料是否有附件；历史复查意见不算材料
    const materials = hazard.records.filter(
      (r) => r.action === '提交整改' || r.action === '补充材料'
    )
    const latest = materials[materials.length - 1]
    if (!latest || latest.attachments.length === 0) {
      reasons.push(
        '最新整改/补充材料未上传任何附件，无附件不得复查；请退回并通知提交人补充佐证材料（照片、检测记录等）。'
      )
    }
  }

  if (reasons.length) reasons.push('【隐患归属】' + ownershipOf(hazard))
  return { ok: reasons.length === 0, reasons }
}

/**
 * 提交整改 / 补充材料前置校验：
 * - 管理员不可操作；复查员只能审核，不能替提交人提交
 * - 只有隐患归属提交人本人可以操作（越权拒绝）
 * - 必须上传附件、填写处理意见
 * - 仅 待整改 / 待重新整改 可“提交整改”；待复查 只能“补充材料”
 */
export const checkSubmitGuard = (
  hazard: Hazard,
  user: CurrentUser,
  payload: { opinion: string; attachments: Attachment[]; mode: '提交整改' | '补充材料' },
  isAdmin: boolean
): GuardResult => {
  const reasons: string[] = []

  if (isAdmin) {
    reasons.push('管理员仅可查看受控汇总，不能提交整改材料。')
  } else if (user.canReview) {
    reasons.push('复查账号仅可执行复查审核，不能提交整改材料。')
  } else if (hazard.reporter !== user.username) {
    reasons.push(
      `该隐患归属提交人「${hazard.reporterName}（${hazard.reporter}）」，当前账号「${user.realName}」无权代为提交。`
    )
  }

  const allowed: HazardStatus[] =
    payload.mode === '补充材料' ? ['待复查'] : ['待整改', '待重新整改']
  if (!allowed.includes(hazard.status)) {
    reasons.push(
      payload.mode === '补充材料'
        ? `仅「待复查」状态可补充材料，当前状态为「${hazard.status}」。`
        : `当前状态为「${hazard.status}」，无需重复提交整改。`
    )
  }

  if (!payload.opinion.trim()) {
    reasons.push('请填写处理意见。')
  }
  if (payload.attachments.length === 0) {
    reasons.push('请至少上传一个整改佐证附件（照片/文档/检测记录），无附件不得提交。')
  }

  if (reasons.length) reasons.push('【隐患归属】' + ownershipOf(hazard))
  return { ok: reasons.length === 0, reasons }
}

export const useHazardStore = defineStore('hazard', () => {
  const hazards = ref<Hazard[]>(loadHazards())

  const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hazards.value))
  }

  const getById = (id: number) => hazards.value.find((h) => h.id === id)

  /**
   * 风险统计 —— 与隐患列表同一份数据源实时计算，
   * 杜绝“风险统计与隐患状态对不上”。未闭环隐患计入风险总数。
   */
  const stats = computed(() => calcStats(hazards.value))

  /** 按状态分组的等级分布（供图表使用） */
  const levelDistribution = computed(() => buildLevelDistribution(stats.value))

  const ownershipText = (hazard: Hazard) => ownershipOf(hazard)

  /** 复查前置校验，详见 checkReviewGuard */
  const guardReview = (hazardId: number, user: CurrentUser): GuardResult => {
    const hazard = getById(hazardId)
    if (!hazard) return { ok: false, reasons: ['隐患不存在或已被删除。'] }
    return checkReviewGuard(hazard, user)
  }

  /** 提交整改 / 补充材料前置校验，详见 checkSubmitGuard */
  const guardSubmit = (
    hazardId: number,
    user: CurrentUser,
    payload: { opinion: string; attachments: Attachment[]; mode: '提交整改' | '补充材料' },
    isAdmin: boolean
  ): GuardResult => {
    const hazard = getById(hazardId)
    if (!hazard) return { ok: false, reasons: ['隐患不存在或已被删除。'] }
    return checkSubmitGuard(hazard, user, payload, isAdmin)
  }

  /** 追加处理记录（唯一写入口，历史意见永不覆盖） */
  const appendRecord = (hazardId: number, record: Omit<HazardRecord, 'id' | 'time'>) => {
    const hazard = getById(hazardId)
    if (!hazard) throw new Error('隐患不存在')
    hazard.records.push({ ...record, id: recordSeq++, time: now() })
  }

  /** 提交整改 / 补充材料 */
  const submitRectification = (
    hazardId: number,
    user: CurrentUser,
    payload: { opinion: string; attachments: Attachment[]; mode: '提交整改' | '补充材料' }
  ) => {
    const hazard = getById(hazardId)
    if (!hazard) return
    appendRecord(hazardId, {
      action: payload.mode,
      operator: user.realName,
      operatorRole: user.roleName,
      opinion: payload.opinion.trim(),
      attachments: payload.attachments
    })
    // 两种动作都使隐患进入待复查；状态单一来源于此，列表/统计/详情自动同步
    hazard.status = '待复查'
    persist()
  }

  /** 复查结论（通过 -> 已闭环；不通过 -> 待重新整改）。历史记录原样保留 */
  const submitReview = (
    hazardId: number,
    user: CurrentUser,
    result: '通过' | '不通过',
    opinion: string
  ) => {
    const hazard = getById(hazardId)
    if (!hazard) return
    appendRecord(hazardId, {
      action: result === '通过' ? '复查通过' : '复查不通过',
      operator: user.realName,
      operatorRole: user.roleName,
      opinion: opinion.trim(),
      attachments: []
    })
    hazard.status = result === '通过' ? '已闭环' : '待重新整改'
    persist()
  }

  /** 登记新隐患（提交人） */
  const createHazard = (
    user: CurrentUser,
    data: { hazardDesc: string; location: string; level: Hazard['level'] }
  ) => {
    const id = (hazards.value.reduce((max, h) => Math.max(max, h.id), 0) + 1)
    const year = new Date().getFullYear()
    const code = `HZ-${year}${String(id).padStart(3, '0')}`
    const d = new Date()
    const foundDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`
    const hazard: Hazard = {
      id,
      hazardCode: code,
      hazardDesc: data.hazardDesc.trim(),
      location: data.location.trim(),
      level: data.level,
      status: '待整改',
      foundDate,
      reporter: user.username,
      reporterName: user.realName,
      records: [
        makeRecord('登记', user.realName, user.roleName, data.hazardDesc.trim())
      ]
    }
    hazards.value.unshift(hazard)
    persist()
    return hazard
  }

  /** 测试/演示用：恢复种子数据 */
  const resetSeed = () => {
    hazards.value = seedHazards()
    persist()
  }

  return {
    hazards,
    stats,
    levelDistribution,
    getById,
    ownershipText,
    guardReview,
    guardSubmit,
    submitRectification,
    submitReview,
    createHazard,
    resetSeed
  }
})
