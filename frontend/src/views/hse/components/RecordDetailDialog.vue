<template>
  <el-dialog v-model="visible" title="隐患处理记录" width="720px">
    <div v-if="hazard">
      <el-descriptions :column="2" border size="small" class="mb-16">
        <el-descriptions-item label="隐患编号">{{ hazard.hazardCode }}</el-descriptions-item>
        <el-descriptions-item label="等级">
          <el-tag :type="levelType" size="small">{{ hazard.level }}风险</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="位置">{{ hazard.location }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="statusType" size="small">{{ hazard.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="归属提交人">
          {{ hazard.reporterName }}（{{ hazard.reporter }}）
        </el-descriptions-item>
        <el-descriptions-item label="发现日期">{{ hazard.foundDate }}</el-descriptions-item>
        <el-descriptions-item label="隐患描述" :span="2">{{ hazard.hazardDesc }}</el-descriptions-item>
      </el-descriptions>

      <div class="section-title">
        处理意见时间线（共 {{ hazard.records.length }} 条，历史意见永久保留、不可覆盖）
      </div>
      <el-timeline>
        <el-timeline-item
          v-for="r in hazard.records"
          :key="r.id"
          :type="actionType(r.action)"
          :timestamp="`${r.time} · ${r.operator}（${r.operatorRole}）`"
          placement="top"
        >
          <el-tag :type="actionType(r.action)" size="small" class="action-tag">{{ r.action }}</el-tag>
          <div class="record-opinion">{{ r.opinion }}</div>
          <div v-if="r.attachments.length" class="record-files">
            <el-tag
              v-for="f in r.attachments"
              :key="f.id"
              type="info"
              size="small"
              class="file-tag"
            >
              <el-icon><Paperclip /></el-icon>{{ f.name }}
            </el-tag>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
    <template #footer>
      <el-button type="primary" @click="visible = false">返回列表</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHazardStore } from '@/store/modules/hazard'
import type { Hazard, RecordAction } from '@/types/hazard'

const hazardStore = useHazardStore()
const visible = ref(false)
const hazardId = ref<number | null>(null)

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
    case '待重新整改':
      return 'danger'
    default:
      return 'info'
  }
})

const actionType = (action: RecordAction) => {
  switch (action) {
    case '复查通过':
      return 'success'
    case '复查不通过':
      return 'danger'
    case '提交整改':
    case '补充材料':
      return 'warning'
    default:
      return 'primary'
  }
}

const open = (id: number) => {
  hazardId.value = id
  visible.value = true
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.mb-16 {
  margin-bottom: 16px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin: 4px 0 16px;
}
.action-tag {
  margin-bottom: 6px;
}
.record-opinion {
  font-size: 13px;
  color: #334155;
  line-height: 1.7;
}
.record-files {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.file-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
