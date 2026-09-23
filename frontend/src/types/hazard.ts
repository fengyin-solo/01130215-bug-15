// 隐患整改-复查流程相关类型

/** 隐患状态 */
export type HazardStatus =
  | '待整改' // 已登记，等待提交人整改
  | '待复查' // 提交人已提交整改/补充材料，等待具备复查权限的账号审核
  | '已闭环' // 复查通过，隐患关闭
  | '待重新整改' // 复查不通过，退回提交人重新整改

/** 隐患等级 */
export type HazardLevel = '高' | '中' | '低'

/** 处理记录动作类型（历史记录只追加，不覆盖） */
export type RecordAction = '登记' | '提交整改' | '补充材料' | '复查通过' | '复查不通过'

/** 附件 */
export interface Attachment {
  id: number
  name: string
  size: number
  uploader: string
  uploadTime: string
}

/**
 * 处理记录（处理意见）。
 * 不同角色的意见各自独立成一条记录，按时间追加，任何操作都不允许覆盖已有意见。
 */
export interface HazardRecord {
  id: number
  action: RecordAction
  operator: string
  operatorRole: string
  opinion: string
  attachments: Attachment[]
  time: string
}

export interface Hazard {
  id: number
  hazardCode: string
  hazardDesc: string
  location: string
  level: HazardLevel
  status: HazardStatus
  foundDate: string
  /** 隐患归属：登记/提交整改的责任人账号 */
  reporter: string
  reporterName: string
  records: HazardRecord[]
}

/** 当前登录用户（mock 账号体系） */
export interface CurrentUser {
  username: string
  realName: string
  roleKey: string
  roleName: string
  /** 是否具备复查权限 */
  canReview: boolean
  /** 管理员：只能查看受控汇总 */
  isAdmin: boolean
}
