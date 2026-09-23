<template>
  <el-dialog
    v-model="visible"
    title="隐患复查"
    width="640px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div v-if="hazard" class="review-dialog">
      <!-- 隐患与归属信息 -->
      <el-descriptions :column="2" border size="small" class="mb-16">
        <el-descriptions-item label="隐患编号">{{ hazard.hazardCode }}</el-descriptions-item>
        <el-descriptions-item label="等级">
          <el-tag :type="levelType" size="small">{{ hazard.level }}风险</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="位置">{{ hazard.location }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="statusType" size="small">{{ hazard.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="隐患描述" :span="2">{{ hazard.hazardDesc }}</el-descriptions-item>
        <el-descriptions-item label="归属提交人">
          {{ hazard.reporterName }}（{{ hazard.reporter }}）
        </el-descriptions-item>
        <el-descriptions-item label="复查人">
          {{ user?.realName }}（{{ user?.roleName }}）
        </el-descriptions-item>
      </el-descriptions>

      <!-- 拒绝原因：越权 / 重复复查 / 无附件，均在弹窗内指出并标注隐患归属 -->
      <el-alert
        v-if="denyReasons.length"
        class="mb-16"
        type="error"
        :closable="false"
        show-icon
        title="复查被拒绝"
      >
        <div class="deny-list">
          <div v-for="(r, i) in denyReasons" :key="i" class="deny-item">· {{ r }}</div>
        </div>
      </el-alert>

      <!-- 最新整改/补充材料 -->
      <div class="section-title">待核材料（最新一次）</div>
      <div v-if="latestMaterial" class="material-box">
        <div class="material-meta">
          {{ latestMaterial.operator }}（{{ latestMaterial.operatorRole }}） ·
          {{ latestMaterial.action }} · {{ latestMaterial.time }}
        </div>
        <div class="material-opinion">{{ latestMaterial.opinion }}</div>
        <div v-if="latestMaterial.attachments.length" class="attachment-list">
          <el-tag
            v-for="f in latestMaterial.attachments"
            :key="f.id"
            type="info"
            size="small"
            class="attachment-tag"
          >
            <el-icon><Paperclip /></el-icon>
            {{ f.name }}
          </el-tag>
        </div>
        <el-text v-else type="danger" size="small">未上传任何附件，不具备复查条件</el-text>
      </div>
      <el-empty v-else description="尚无整改/补充材料" :image-size="60" />

      <!-- 复查意见 -->
      <el-form label-position="top" class="mt-12">
        <el-form-item label="复查意见" required>
          <el-input
            v-model="opinion"
            type="textarea"
            :rows="3"
            :disabled="!canPassGuard"
            placeholder="请填写现场核查情况与复查结论依据"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="danger" :disabled="!canPassGuard" @click="handleSubmit('不通过')">
        复查不通过（退回重改）
      </el-button>
      <el-button type="success" :disabled="!canPassGuard" @click="handleSubmit('通过')">
        复查通过（闭环）
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useHazardStore } from '@/store/modules/hazard'
import { useUserStore } from '@/store/modules/user'
import type { Hazard, HazardRecord } from '@/types/hazard'

const hazardStore = useHazardStore()
const userStore = useUserStore()

const visible = ref(false)
const hazardId = ref<number | null>(null)
const opinion = ref('')
/** 每次打开弹窗实时校验的拒绝原因；为空才允许提交复查 */
const denyReasons = ref<string[]>([])

const user = computed(() => userStore.currentUser)
const hazard = computed<Hazard | undefined>(() =>
  hazardId.value === null ? undefined : hazardStore.getById(hazardId.value)
)

const levelType = computed(() =>
  hazard.value?.level === '高' ? 'danger' : hazard.value?.level === '中' ? 'warning' : 'info'
)
const statusType = computed(() => {
  switch (hazard.value?.status) {
    case '已闭环':
      return 'success'
    case '待复查':
      return 'warning'
    default:
      return 'info'
  }
})

const latestMaterial = computed<HazardRecord | undefined>(() => {
  if (!hazard.value) return undefined
  const materials = hazard.value.records.filter(
    (r) => r.action === '提交整改' || r.action === '补充材料'
  )
  return materials[materials.length - 1]
})

/** 复查权限/状态/附件三项守卫全过才放行；任一不过即在弹窗内拒绝 */
const canPassGuard = computed(() => denyReasons.value.length === 0 && !!user.value)

const open = (id: number) => {
  hazardId.value = id
  opinion.value = ''
  visible.value = true
}

// 弹窗打开期间数据可能变化（如补充材料后重新打开），打开时与 store 实时校验
watch(visible, (v) => {
  if (v && hazardId.value !== null && user.value) {
    denyReasons.value = hazardStore.guardReview(hazardId.value, user.value).reasons
  }
})

const handleSubmit = (result: '通过' | '不通过') => {
  if (hazardId.value === null || !user.value) return
  // 提交瞬间再次校验，防止停留期间状态被改变导致重复复查
  const guard = hazardStore.guardReview(hazardId.value, user.value)
  denyReasons.value = guard.reasons
  if (!guard.ok) return

  if (!opinion.value.trim()) {
    ElMessage.warning('请填写复查意见')
    return
  }

  hazardStore.submitReview(hazardId.value, user.value, result, opinion.value)
  ElMessage.success(
    result === '通过' ? '复查通过，隐患已闭环' : '已退回提交人重新整改'
  )
  visible.value = false
}

const handleClosed = () => {
  hazardId.value = null
  opinion.value = ''
  denyReasons.value = []
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.mb-16 {
  margin-bottom: 16px;
}
.mt-12 {
  margin-top: 12px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}
.material-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
}
.material-meta {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}
.material-opinion {
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
  margin-bottom: 8px;
}
.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.attachment-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.deny-list {
  margin-top: 4px;
}
.deny-item {
  line-height: 1.8;
}
</style>
