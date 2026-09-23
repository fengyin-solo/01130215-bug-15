<template>
  <div class="hse-container">
    <!-- 当前账号与角色 -->
    <el-alert
      class="mb-20"
      :closable="false"
      :type="roleBanner.type"
      show-icon
    >
      <template #title>
        当前账号：{{ user?.realName }}（{{ user?.username }}） · 角色：{{ user?.roleName }}
        <span class="role-rule">{{ roleBanner.rule }}</span>
      </template>
    </el-alert>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.riskCount }}</div>
            <div class="stat-label">未闭环风险</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card high">
          <div class="stat-icon"><el-icon><CircleClose /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.highRisk }}</div>
            <div class="stat-label">高风险</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card medium">
          <div class="stat-icon"><el-icon><WarningFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.mediumRisk }}</div>
            <div class="stat-label">中风险</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card low">
          <div class="stat-icon"><el-icon><InfoFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.lowRisk }}</div>
            <div class="stat-label">低风险</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 管理员专属：受控汇总（只读，不可操作任何隐患） -->
    <el-card v-if="isAdmin" class="mb-20 controlled-summary">
      <template #header>
        <div class="card-header">
          <span>隐患受控汇总（只读）</span>
          <el-tag type="info" size="small">管理员视图</el-tag>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="summary-block">
            <div class="summary-title">按状态</div>
            <div class="summary-row"><span>待整改</span><b>{{ stats.pendingRectify }}</b></div>
            <div class="summary-row"><span>待复查</span><b>{{ stats.pendingReview }}</b></div>
            <div class="summary-row"><span>待重新整改</span><b>{{ stats.reRectify }}</b></div>
            <div class="summary-row closed"><span>已闭环</span><b>{{ stats.closedCount }}</b></div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="summary-block">
            <div class="summary-title">按等级（未闭环）</div>
            <div class="summary-row danger"><span>高风险</span><b>{{ stats.highRisk }}</b></div>
            <div class="summary-row warning"><span>中风险</span><b>{{ stats.mediumRisk }}</b></div>
            <div class="summary-row primary"><span>低风险</span><b>{{ stats.lowRisk }}</b></div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="summary-block">
            <div class="summary-title">按归属提交人</div>
            <div v-for="g in ownerGroups" :key="g.reporter" class="summary-row">
              <span>{{ g.reporterName }}（{{ g.reporter }}）</span>
              <b>{{ g.count }} 项 / 未闭环 {{ g.openCount }}</b>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>环保监测数据</span>
              <el-button type="primary" size="small" @click="initMonitorChart">实时刷新</el-button>
            </div>
          </template>
          <div ref="monitorChart" class="chart-large"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>风险等级分布（与隐患列表同源）</span>
          </template>
          <div ref="riskChart" class="chart-medium"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="15">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>安全隐患排查</span>
              <div>
                <el-button size="small" @click="goRecords">处理记录</el-button>
                <el-button
                  v-if="canRegister"
                  type="primary"
                  size="small"
                  @click="createDialogRef?.open()"
                >
                  新增隐患
                </el-button>
              </div>
            </div>
          </template>

          <div class="filter-bar">
            <el-select v-model="statusFilter" placeholder="状态" clearable size="small" style="width: 130px">
              <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
            </el-select>
            <el-select v-model="levelFilter" placeholder="等级" clearable size="small" style="width: 110px">
              <el-option label="高" value="高" />
              <el-option label="中" value="中" />
              <el-option label="低" value="低" />
            </el-select>
            <el-input
              v-model="keyword"
              placeholder="编号/描述/位置"
              clearable
              size="small"
              style="width: 200px"
            />
          </div>

          <el-table :data="filteredHazards" size="small" height="360">
            <el-table-column prop="hazardCode" label="隐患编号" width="110" />
            <el-table-column prop="hazardDesc" label="隐患描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="location" label="位置" width="80" />
            <el-table-column label="归属" width="110">
              <template #default="{ row }">{{ row.reporterName }}</template>
            </el-table-column>
            <el-table-column label="等级" width="70">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="230" fixed="right">
              <template #default="{ row }">
                <el-button type="info" size="small" link @click="recordDialogRef?.open(row.id)">
                  处理记录
                </el-button>

                <!-- 具备复查权限的账号：只能复查待复查隐患；越权/无附件/重复复查在弹窗内拒绝 -->
                <el-button
                  v-if="canReview"
                  type="success"
                  size="small"
                  link
                  :disabled="row.status !== '待复查'"
                  @click="reviewDialogRef?.open(row.id)"
                >
                  复查
                </el-button>

                <!-- 提交人：仅本人隐患可提交整改 / 补充材料 -->
                <template v-if="isSubmitter && row.reporter === user?.username">
                  <el-button
                    v-if="row.status === '待整改' || row.status === '待重新整改'"
                    type="primary"
                    size="small"
                    link
                    @click="submitDialogRef?.open(row.id, '提交整改')"
                  >
                    提交整改
                  </el-button>
                  <el-button
                    v-else-if="row.status === '待复查'"
                    type="warning"
                    size="small"
                    link
                    @click="submitDialogRef?.open(row.id, '补充材料')"
                  >
                    补充材料
                  </el-button>
                </template>

                <el-tooltip
                  v-if="isSubmitter && row.reporter !== user?.username"
                  content="非本账号归属隐患，无权操作"
                  placement="top"
                >
                  <el-button type="primary" size="small" link disabled>处理</el-button>
                </el-tooltip>

                <!-- 管理员：无任何编辑按钮，仅可查看处理记录 -->
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="9">
        <el-card>
          <template #header>
            <span>应急预案</span>
          </template>
          <el-collapse accordion>
            <el-collapse-item title="火灾应急预案" name="1">
              <div class="plan-content">
                <p>1. 立即启动火灾报警装置</p>
                <p>2. 组织人员疏散到安全区域</p>
                <p>3. 使用灭火器进行初期灭火</p>
                <p>4. 拨打消防电话请求支援</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="溢油应急预案" name="2">
              <div class="plan-content">
                <p>1. 立即停止相关作业</p>
                <p>2. 围堵泄漏源防止扩散</p>
                <p>3. 使用吸油材料进行清理</p>
                <p>4. 向上级汇报情况</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="硫化氢泄漏应急预案" name="3">
              <div class="plan-content">
                <p>1. 立即佩戴防毒面具</p>
                <p>2. 撤离到上风方向安全区域</p>
                <p>3. 监测硫化氢浓度变化</p>
                <p>4. 启动应急响应机制</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="人员受伤应急预案" name="4">
              <div class="plan-content">
                <p>1. 确保现场安全后再救援</p>
                <p>2. 进行初步医疗处置</p>
                <p>3. 拨打急救电话送医治疗</p>
                <p>4. 保护事故现场等待调查</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>

    <ReviewDialog ref="reviewDialogRef" />
    <SubmitRectificationDialog ref="submitDialogRef" />
    <RecordDetailDialog ref="recordDialogRef" />
    <HazardCreateDialog v-if="canRegister" ref="createDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useHazardStore } from '@/store/modules/hazard'
import { useUserStore } from '@/store/modules/user'
import ReviewDialog from './components/ReviewDialog.vue'
import SubmitRectificationDialog from './components/SubmitRectificationDialog.vue'
import RecordDetailDialog from './components/RecordDetailDialog.vue'
import HazardCreateDialog from './components/HazardCreateDialog.vue'

const router = useRouter()
const hazardStore = useHazardStore()
const userStore = useUserStore()

const user = computed(() => userStore.currentUser)
const canReview = computed(() => userStore.canReview)
const isAdmin = computed(() => userStore.isAdminView)
const isSubmitter = computed(() => userStore.isSubmitter)
/** 仅提交人角色可登记新隐患；复查员只审核，管理员只看汇总 */
const canRegister = computed(() => userStore.isSubmitter)

const stats = computed(() => hazardStore.stats)

const statusOptions = ['待整改', '待复查', '待重新整改', '已闭环']
const statusFilter = ref('')
const levelFilter = ref('')
const keyword = ref('')

const filteredHazards = computed(() => {
  return hazardStore.hazards.filter((h) => {
    if (statusFilter.value && h.status !== statusFilter.value) return false
    if (levelFilter.value && h.level !== levelFilter.value) return false
    if (keyword.value) {
      const k = keyword.value.trim().toLowerCase()
      const hit =
        h.hazardCode.toLowerCase().includes(k) ||
        h.hazardDesc.toLowerCase().includes(k) ||
        h.location.toLowerCase().includes(k)
      if (!hit) return false
    }
    return true
  })
})

/** 管理员受控汇总：按归属提交人聚合 */
const ownerGroups = computed(() => {
  const map = new Map<string, { reporter: string; reporterName: string; count: number; openCount: number }>()
  for (const h of hazardStore.hazards) {
    const g = map.get(h.reporter) || {
      reporter: h.reporter,
      reporterName: h.reporterName,
      count: 0,
      openCount: 0
    }
    g.count += 1
    if (h.status !== '已闭环') g.openCount += 1
    map.set(h.reporter, g)
  }
  return [...map.values()]
})

const roleBanner = computed(() => {
  if (isAdmin.value) {
    return { type: 'info' as const, rule: '管理员仅可查看受控汇总与处理记录，不能复查或提交整改。' }
  }
  if (canReview.value) {
    return { type: 'success' as const, rule: '具备复查权限：仅可对“待复查”隐患审核；无附件、越权或重复复查将被拒绝。' }
  }
  return { type: 'warning' as const, rule: '提交人：可登记隐患、对本人归属隐患提交整改或补充材料，不能自行复查。' }
})

const getLevelType = (level: string) =>
  level === '高' ? 'danger' : level === '中' ? 'warning' : 'info'

const getStatusType = (status: string) => {
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

const goRecords = () => router.push('/hse/records')

// ---------------- 图表 ----------------
const monitorChart = ref<HTMLElement>()
const riskChart = ref<HTMLElement>()
let monitorInstance: echarts.ECharts | null = null
let riskInstance: echarts.ECharts | null = null

const initMonitorChart = () => {
  if (!monitorChart.value) return
  if (!monitorInstance) monitorInstance = echarts.init(monitorChart.value)
  const times = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`)
  monitorInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['COD', '氨氮', '石油类', '硫化物'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: times },
    yAxis: { type: 'value' },
    series: [
      { name: 'COD', type: 'line', smooth: true, data: [45, 48, 52, 49, 55, 58, 52, 50, 48, 52, 55, 50], itemStyle: { color: '#3b82f6' } },
      { name: '氨氮', type: 'line', smooth: true, data: [2.1, 2.3, 2.5, 2.2, 2.8, 3.0, 2.6, 2.4, 2.3, 2.5, 2.7, 2.4], itemStyle: { color: '#22c55e' } },
      { name: '石油类', type: 'line', smooth: true, data: [0.8, 0.9, 1.2, 1.0, 1.5, 1.8, 1.4, 1.2, 1.0, 1.3, 1.6, 1.2], itemStyle: { color: '#f59e0b' } },
      { name: '硫化物', type: 'line', smooth: true, data: [0.3, 0.35, 0.4, 0.38, 0.45, 0.5, 0.42, 0.38, 0.35, 0.4, 0.45, 0.4], itemStyle: { color: '#ef4444' } }
    ]
  })
}

const renderRiskChart = () => {
  if (!riskChart.value) return
  if (!riskInstance) riskInstance = echarts.init(riskChart.value)
  riskInstance.setOption(
    {
      tooltip: { trigger: 'item' },
      series: [
        {
          name: '风险分布',
          type: 'pie',
          radius: ['40%', '70%'],
          data: hazardStore.levelDistribution,
          label: { formatter: '{b}: {c} ({d}%)' }
        }
      ]
    },
    { notMerge: true }
  )
}

// 风险统计变化时图表同步重绘，保证图表/卡片/列表始终同一数据
watch(
  () => hazardStore.stats,
  () => nextTick(renderRiskChart),
  { deep: true }
)

const resizeHandler = () => {
  monitorInstance?.resize()
  riskInstance?.resize()
}

onMounted(() => {
  initMonitorChart()
  renderRiskChart()
  window.addEventListener('resize', resizeHandler)
})
</script>

<style scoped lang="scss">
.hse-container {
  width: 100%;
}

.role-rule {
  margin-left: 10px;
  font-weight: 400;
  opacity: 0.85;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);

  &.high {
    .stat-value { color: #ef4444; }
    .stat-icon { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  }
  &.medium {
    .stat-value { color: #f59e0b; }
    .stat-icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  }
  &.low {
    .stat-value { color: #3b82f6; }
    .stat-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  }

  .stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: rgba(100, 116, 139, 0.1);
    color: #64748b;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 14px;
    color: #64748b;
  }
}

.controlled-summary {
  border: 1px solid #cbd5e1;
}

.summary-block {
  .summary-title {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 10px;
  }
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
  line-height: 2;
  border-bottom: 1px dashed #e2e8f0;

  b {
    font-weight: 600;
  }
  &.danger b { color: #ef4444; }
  &.warning b { color: #f59e0b; }
  &.primary b { color: #3b82f6; }
  &.closed b { color: #16a34a; }
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.chart-large,
.chart-medium {
  width: 100%;
  height: 300px;
}

.plan-content {
  p {
    margin: 8px 0;
    color: #475569;
    line-height: 1.6;
  }
}
</style>
