<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>单井全生命周期管理系统</h2>
        <p>Well Lifecycle Management System</p>
      </div>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="w-full" :loading="loading" @click="handleLogin">登录</el-button>
        </el-form-item>
      </el-form>

      <div class="quick-accounts">
        <div class="quick-title">演示账号（密码均为 123456，点击填充）</div>
        <div class="quick-list">
          <div
            v-for="acc in accounts"
            :key="acc.username"
            class="quick-item"
            @click="fillAccount(acc.username)"
          >
            <el-tag :type="acc.tag" size="small">{{ acc.roleName }}</el-tag>
            <span class="quick-user">{{ acc.username }}</span>
            <span class="quick-desc">{{ acc.desc }}</span>
          </div>
        </div>
      </div>

      <div class="login-footer">
        <p>© 2024 油气行业数字化平台</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance } from 'element-plus'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: 'hse',
  password: '123456'
})

const accounts = [
  { username: 'hse', roleName: 'HSE复查员', tag: 'success', desc: '可复查审核' },
  { username: 'operator', roleName: '提交人', tag: 'warning', desc: '提交整改/补充材料' },
  { username: 'admin', roleName: '管理员', tag: 'info', desc: '仅查看受控汇总' }
]

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const fillAccount = (username: string) => {
  loginForm.username = username
  loginForm.password = '123456'
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const user = userStore.login(loginForm.username, loginForm.password)
      ElMessage.success(`登录成功，当前角色：${user.roleName}`)
      router.push('/hse')
    } catch (e: any) {
      ElMessage.error(e.message || '登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.login-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  h2 {
    font-size: 22px;
    color: #1e3a8a;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: #64748b;
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 22px;
  }
}

.quick-accounts {
  border-top: 1px dashed #e2e8f0;
  padding-top: 16px;

  .quick-title {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 10px;
  }

  .quick-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .quick-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid #eef2f7;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #3b82f6;
      background: #f0f7ff;
    }

    .quick-user {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      width: 64px;
    }

    .quick-desc {
      font-size: 12px;
      color: #94a3b8;
      margin-left: auto;
    }
  }
}

.login-footer {
  text-align: center;
  margin-top: 24px;

  p {
    font-size: 12px;
    color: #94a3b8;
  }
}
</style>
