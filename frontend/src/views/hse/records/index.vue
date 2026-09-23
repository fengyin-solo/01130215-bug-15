<template>
  <div class="records-container">
    <el-card class="mb-20">
      <div class="page-header">
        <div class="header-left">
          <el-button :icon="ArrowLeft" plain @click="goBack">返回隐患列表</el-button>
          <span class="page-title">隐患处理记录</span>
          <el-tag size="small" type="info">
            当前账号：{{ user?.realName }} · {{ user?.roleName }}
          </el-tag>
        </div>
        <el-tooltip content="状态与统计直接读取隐患主数据，返回列表后自动保持同步" placement="top">
          <el-tag type="success" size="small">状态/统计与列表同源</el-tag>
        </el-tooltip>
      </div>

      <!-- 与主页面同一数据源的统计快照 -->
      <div class="stat-strip">
        <div class="strip-item">未闭环风险 <b>{{ stats.riskCount }}</b></div>
        <div class="strip-item danger">高 <b>{{ stats.highRisk }}</b></div>
        <div class="strip-item warning">中 <b>{{ stats.mediumRisk }}</b></div>
        <div class="strip-item primary">低 <b>{{ stats.lowRisk }}</b></div>
        <div class="strip-item">待整改 <b>{{ stats.pendingRectify }}</b></div>
        <div class="strip-item">待复查 <b>{{ stats.pendingReview }}</b></div>
        <div class="strip-item danger">退回重改 <b>{{ stats.reRectify }}</b></div>
        <div class="strip-item success">已闭环 <b>{{ stats.closedCount }}</b></div>
      </div>
    </el-card>

    <el-card v-for="h in hazards" :key="h.id" class="mb-20 hazard-record-card">
      <template #header>
        <div class="record-card-header">
          <div class="hazard-meta">
            <el-tag size="small" type="info">{{ h.hazardCode }}</el-tag>
            <el-tag :type="levelType(h.level)" size="small">{{ h.level }}风险</el-tag>
            <el-tag :type="statusType(h.status)" size="small">{{ h.status }}</el-tag>
            <span class="hazard-desc">{{ h.hazardDesc }}</span>
          </div>
          <div class="hazard-actions">
            <span class="owner-text">归属：{{ h.reporterName }}（{{ h.reporter }}） · {{ h.location }}</span>

            <el-button
              v-if="canReview && h.status === '待复查'"
              type="success"
              size="small"
              link
              @click="reviewDialogRef?.open(h.id)"
            >
              复查
            </el-button>
            <template v-if="isSubmitter && h.reporter === user?.username">
              <el-button
                v-if="h.status === '待整改' || h.status === '待重新整改'"
                type="primary"
                size="small"
                link
                @click="submitDialogRef?.open(h.id, '提交整改')"
              >
                提交整改
              </el-button>
              <el-button
                v-else-if="h.status === '待复查'"
                type="warning"
                size="small"
                link
                @click="submitDialogRef?.open(h.id, '补充材料')"
              >
                补充材料
              </el-button>
            </template>
          </div>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="r in h.records"
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
    </el-card>

    <ReviewDialog ref="reviewDialogRef" />
    <SubmitRectificationDialog ref="submitDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useHazardStore } from '@/store/modules/hazard'
import { useUserStore } from '@/store/modules/user'
import type { HazardStatus, RecordAction } from '@/types/hazard'
import ReviewDialog from '../components/ReviewDialog.vue'
import SubmitRectificationDialog from '../components/SubmitRectificationDialog.vue'

const router = useRouter()
const hazardStore = useHazardStore()
const userStore = useUserStore()

const user = computed(() => userStore.currentUser)
const canReview = computed(() => userStore.canReview)
const isSubmitter = computed(() => userStore.isSubmitter)
const hazards = computed(() => hazardStore.hazards)
const stats = computed(() => hazardStore.stats)

const goBack = () => router.push('/hse')

const levelType = (level: string) =>
  level === '高' ? 'danger' : level === '中' ? 'warning' : 'info'

const statusType = (status: HazardStatus) => {
  switch (status) {
    case '已闭环':
      return 'success'
    case '待复查':
      return 'warning'
    case '待重新整改':
      return 'danger'
    default:
      return 'info'
  }
}

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
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.stat-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;

  .strip-item {
    font-size: 13px;
    color: #64748b;

    b {
      margin-left: 4px;
      font-size: 15px;
      color: #1e293b;
    }
    &.danger b { color: #ef4444; }
    &.warning b { color: #f59e0b; }
    &.primary b { color: #3b82f6; }
    &.success b { color: #16a34a; }
  }
}

.record-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.hazard-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hazard-desc {
  font-size: 13px;
  color: #334155;
  margin-left: 4px;
}

.hazard-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.owner-text {
  font-size: 12px;
  color: #94a3b8;
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
