<template>
  <el-dialog v-model="visible" title="新增隐患登记" width="560px" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="92px">
      <el-form-item label="隐患描述" prop="hazardDesc">
        <el-input v-model="form.hazardDesc" type="textarea" :rows="3" placeholder="描述隐患内容与风险" />
      </el-form-item>
      <el-form-item label="所在位置" prop="location">
        <el-input v-model="form.location" placeholder="如：A井场 / 配电房" />
      </el-form-item>
      <el-form-item label="风险等级" prop="level">
        <el-radio-group v-model="form.level">
          <el-radio value="高">高</el-radio>
          <el-radio value="中">中</el-radio>
          <el-radio value="低">低</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">登记</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useHazardStore } from '@/store/modules/hazard'
import { useUserStore } from '@/store/modules/user'
import type { HazardLevel } from '@/types/hazard'

const hazardStore = useHazardStore()
const userStore = useUserStore()

const visible = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  hazardDesc: '',
  location: '',
  level: '中' as HazardLevel
})

const rules = {
  hazardDesc: [{ required: true, message: '请输入隐患描述', trigger: 'blur' }],
  location: [{ required: true, message: '请输入位置', trigger: 'blur' }],
  level: [{ required: true, message: '请选择等级', trigger: 'change' }]
}

const open = () => {
  form.hazardDesc = ''
  form.location = ''
  form.level = '中'
  visible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value || !userStore.currentUser) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const h = hazardStore.createHazard(userStore.currentUser!, { ...form })
    ElMessage.success(`隐患 ${h.hazardCode} 已登记，状态：待整改`)
    visible.value = false
  })
}

defineExpose({ open })
</script>
