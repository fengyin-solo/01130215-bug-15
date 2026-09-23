import { defineStore } from 'pinia'
import type { CurrentUser } from '@/types/hazard'

interface UserState {
  token: string
  userInfo: Partial<CurrentUser>
  roles: string[]
  permissions: string[]
}

/** Mock 账号：角色与复查权限在此集中配置 */
export const MOCK_ACCOUNTS: (CurrentUser & { password: string })[] = [
  {
    username: 'admin',
    password: '123456',
    realName: '系统管理员',
    roleKey: 'admin',
    roleName: '管理员',
    canReview: false,
    isAdmin: true
  },
  {
    username: 'hse',
    password: '123456',
    realName: 'HSE审核员',
    roleKey: 'hse_reviewer',
    roleName: 'HSE复查员',
    canReview: true,
    isAdmin: false
  },
  {
    username: 'operator',
    password: '123456',
    realName: '现场操作员',
    roleKey: 'field_operator',
    roleName: '现场操作员（提交人）',
    canReview: false,
    isAdmin: false
  }
]

const SESSION_KEY = 'hazard_session'
const TOKEN_KEY = 'token'

function loadSession(): { user: CurrentUser | null; token: string } {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const session = JSON.parse(raw)
      return { user: session.user, token: localStorage.getItem(TOKEN_KEY) || '' }
    }
  } catch (e) {
    // ignore broken session
  }
  return { user: null, token: localStorage.getItem(TOKEN_KEY) || '' }
}

const initial = loadSession()

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: initial.token,
    userInfo: initial.user || {},
    roles: initial.user ? [initial.user.roleKey] : [],
    permissions: initial.user
      ? [
          ...(initial.user.canReview ? ['hazard:review'] : []),
          ...(initial.user.isAdmin ? ['hazard:summary:view'] : []),
          ...(!initial.user.isAdmin ? ['hazard:handle'] : [])
        ]
      : []
  }),

  getters: {
    currentUser(state): CurrentUser | null {
      return state.userInfo.username ? (state.userInfo as CurrentUser) : null
    },
    /** 是否具备复查权限（复查按钮/弹窗入口的唯一依据） */
    canReview(): boolean {
      return !!this.currentUser?.canReview
    },
    isAdminView(): boolean {
      return !!this.currentUser?.isAdmin
    },
    /** 提交人：非管理员的一线账号，只能登记隐患 / 提交整改 / 补充材料 */
    isSubmitter(): boolean {
      const u = this.currentUser
      return !!u && !u.isAdmin && !u.canReview
    }
  },

  actions: {
    /** mock 登录：校验账号密码并写入会话 */
    login(username: string, password: string): CurrentUser {
      const account = MOCK_ACCOUNTS.find(
        (a) => a.username === username.trim() && a.password === password
      )
      if (!account) {
        throw new Error('用户名或密码错误')
      }
      const { password: _pwd, ...user } = account
      const token = 'mock-token-' + Date.now()
      this.token = token
      this.userInfo = user
      this.roles = [user.roleKey]
      this.permissions = [
        ...(user.canReview ? ['hazard:review'] : []),
        ...(user.isAdmin ? ['hazard:summary:view'] : []),
        ...(!user.isAdmin ? ['hazard:handle'] : [])
      ]
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user }))
      return user
    },

    /** 页面刷新后从本地会话恢复（不重新发 token） */
    restore() {
      const { user, token } = loadSession()
      if (user && token) {
        this.userInfo = user
        this.roles = [user.roleKey]
        this.permissions = [
          ...(user.canReview ? ['hazard:review'] : []),
          ...(user.isAdmin ? ['hazard:summary:view'] : []),
          ...(!user.isAdmin ? ['hazard:handle'] : [])
        ]
        this.token = token
      }
    },

    logout() {
      this.token = ''
      this.userInfo = {}
      this.roles = []
      this.permissions = []
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(SESSION_KEY)
    }
  }
})
