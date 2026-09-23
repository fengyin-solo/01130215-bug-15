<template>
  <el-dialog
    v-model="visible"
    :title="mode === '补充材料' ? '补充整改材料' : '提交整改结果'"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div v-if="hazard" class="submit-dialog">
      <el-descriptions :column="2" border size="small" class="mb-16">
        <el-descriptions-item label="隐患编号">{{ hazard.hazardCode }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag size="small">{{ hazard.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="位置">{{ hazard.location }}</el-descriptions-item>
        <el-descriptions-item label="归属提交人">
          {{ hazard.reporterName }}（{{ hazard.reporter }}）
        </el-descriptions-item>
        <el-descriptions-item label="隐患描述" :span="2">{{ hazard.hazardDesc }}</el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="denyReasons.length"
        class="mb-16"
        type="error"
        :closable="false"
        show-icon
        title="操作被拒绝"
      >
        <div v-for="(r, i) in denyReasons" :key="i" class="deny-item">· {{ r }}</div>
      </el-alert>

      <el-form label-position="top">
        <el-form-item label="处理意见" required>
          <el-input
            v-model="opinion"
            type="textarea"
            :rows="3"
            :disabled="!allowed"
            placeholder="说明整改措施、完成情况；不同角色的处理意见分别留痕，不会互相覆盖"
          />
        </el-form-item>
        <el-form-item required>
          <template #label>
            整改佐证附件
            <el-text type="danger" size="small">（必传，无附件不能提交复查）</el-text>
          </template>
          <el-upload
            :disabled="!allowed"
            :auto-upload="false"
            :show-file-list="true"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            :on-exceed="onExceed"
            :limit="9"
            multiple
            :file-list="fileList"
          >
            <el-button type="primary" plain size="small" :disabled="!allowed">
              <el-icon><Upload /></el-icon>
              选择附件（照片/文档/检测记录）
            </el-button>
            <template #tip>
              <div class="upload-tip">演示环境不上传服务器，仅记录文件名作为整改佐证；最多 9 个。</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!allowed" @click="handleSubmit">
        {{ mode === '补充材料' ? '补充并提交复查' : '提交整改' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UploadFile, UploadFiles } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useHazardStore } from '@/store/modules/hazard'
import { useUserStore } from '@/store/modules/user'
import type { Attachment, Hazard } from '@/types/hazard'

const hazardStore = useHazardStore()
const userStore = useUserStore()

const visible = ref(false)
const hazardId = ref<number | null>(null)
const mode = ref<'提交整改' | '补充材料'>('提交整改')
const opinion = ref('')
const fileList = ref<UploadFiles>([])
const denyReasons = ref<string[]>([])

const user = computed(() => userStore.currentUser)
const hazard = computed<Hazard | undefined>(() =>
  hazardId.value === null ? undefined : hazardStore.getById(hazardId.value)
)
const allowed = computed(() => denyReasons.value.length === 0 && !!user.value)

const timeStamp = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`
}

const open = (id: number, m: '提交整改' | '补充材料') => {
  hazardId.value = id
  mode.value = m
  opinion.value = ''
  fileList.value = []
  visible.value = true
}

watch(visible, (v) => {
  if (v && hazardId.value !== null && user.value) {
    denyReasons.value = hazardStore.guardSubmit(
      hazardId.value,
      user.value,
      { opinion: opinion.value, attachments: [], mode: mode.value },
      userStore.isAdminView
    ).reasons
  }
})

const toAttachments = (): Attachment[] =>
  fileList.value
    .filter((f) => f.name)
    .map((f) => ({
      id: Date.now() + Math.floor(Math.random() * 100000),
      name: f.name,
      size: f.size || 0,
      uploader: user.value?.realName || '',
      uploadTime: timeStamp()
    }))

const onFileChange = (file: UploadFile, files: UploadFiles) => {
  fileList.value = files
}
const onFileRemove = (_file: UploadFile, files: UploadFiles) => {
  fileList.value = files
}
const onExceed = () => {
  ElMessage.warning('最多上传 9 个附件')
}

const handleSubmit = () => {
  if (hazardId.value === null || !user.value || !hazard.value) return
  const attachments = toAttachments()
  // 提交瞬间重新执行守卫：越权 / 状态不符 / 无附件 / 无意见 全部拒绝
  const guard = hazardStore.guardSubmit(
    hazardId.value,
    user.value,
    { opinion: opinion.value, attachments, mode: mode.value },
    userStore.isAdminView
  )
  denyReasons.value = guard.reasons
  if (!guard.ok) return

  hazardStore.submitRectification(hazardId.value, user.value, {
    opinion: opinion.value,
    attachments,
    mode: mode.value
  })
  ElMessage.success(mode.value === '补充材料' ? '材料已补充，等待复查' : '整改已提交，等待复查')
  visible.value = false
}

const handleClosed = () => {
  hazardId.value = null
  opinion.value = ''
  fileList.value = []
  denyReasons.value = []
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.mb-16 {
  margin-bottom: 16px;
}
.deny-item {
  line-height: 1.8;
}
.upload-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
