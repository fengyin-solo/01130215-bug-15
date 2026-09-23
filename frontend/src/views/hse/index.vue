<template>
  <div class="hse-container">
    <el-alert
      type="info"
      :closable="false"
      class="mb-20"
      title="风险统计口径：仅统计未闭环隐患（待整改、待复查）；复查通过后，风险总数、等级分布与隐患状态按同一隐患实时同步。"
    />

    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.riskCount }}</div>
            <div class="stat-label">风险总数（未闭环）</div>
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

    <el-row v-if="isAdmin" :gutter="20" class="mb-20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>受控汇总（管理员只读）</span>
              <el-tag type="info" size="small">管理员不可提交整改、不可复查，仅可查看本汇总与处理记录</el-tag>
            </div>
          </template>
          <el-descriptions :column="4" border size="small">
            <el-descriptions-item label="隐患总数">{{ adminSummary.total }}</el-descriptions-item>
            <el-descriptions-item label="待整改">
              <span class="text-warning">{{ adminSummary.pendingRectification }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="待复查">
              <span class="text-primary">{{ adminSummary.pendingReview }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="已闭环（已整改）">
              <span class="text-success">{{ adminSummary.closed }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="未闭环高风险">
              <span class="text-danger">{{ adminSummary.highRisk }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="未闭环中风险">
              <span class="text-warning">{{ adminSummary.mediumRisk }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="未闭环低风险">
              <span class="text-primary">{{ adminSummary.lowRisk }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="未闭环合计">{{ adminSummary.openTotal }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>环保监测数据</span>
              <el-button type="primary" size="small">实时刷新</el-button>
            </div>
          </template>
          <div ref="monitorChart" class="chart-large"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>风险等级分布（未闭环）</span>
          </template>
          <div ref="riskChart" class="chart-medium"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>安全隐患排查</span>
              <div class="header-actions">
                <el-select v-model="currentAccount" size="small" style="width: 210px">
                  <el-option
                    v-for="acc in accounts"
                    :key="acc.account"
                    :label="acc.name"
                    :value="acc.account"
                  />
                </el-select>
                <el-tag :type="roleTagType" size="small">{{ roleHint }}</el-tag>
                <el-button v-if="isSubmitter" type="primary" size="small" @click="openCreateDialog">新增隐患</el-button>
              </div>
            </div>
          </template>
          <el-table :data="hazardList" size="small" border>
            <el-table-column prop="hazardCode" label="隐患编号" width="100" />
            <el-table-column prop="hazardDesc" label="隐患描述" min-width="160" show-overflow-tooltip />
            <el-table-column prop="location" label="位置" width="80" />
            <el-table-column prop="level" label="等级" width="70">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="85">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="归属提交人" width="105">
              <template #default="{ row }">{{ accountName(row.ownerAccount) }}</template>
            </el-table-column>
            <el-table-column label="归属复查人" width="95">
              <template #default="{ row }">{{ accountName(row.reviewerAccount) }}</template>
            </el-table-column>
            <el-table-column prop="foundDate" label="发现日期" width="95" />
            <el-table-column label="操作" width="170" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="isSubmitter && row.ownerAccount === currentAccount"
                  type="primary"
                  size="small"
                  link
                  @click="openProcess(row)"
                >处理</el-button>
                <el-button
                  v-if="isReviewer"
                  type="success"
                  size="small"
                  link
                  @click="openReview(row)"
                >复查</el-button>
                <el-button size="small" link @click="openRecords(row)">处理记录</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="10">
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

    <!-- 隐患处理 / 处理记录 弹窗（提交人可操作，其他角色只读） -->
    <el-dialog
      v-model="processVisible"
      :title="`${processReadonly ? '处理记录' : '隐患处理'} - ${currentHazard?.hazardCode || ''}`"
      width="700px"
      :close-on-click-modal="false"
      @closed="currentHazard = null"
    >
      <template v-if="currentHazard">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="隐患编号">{{ currentHazard.hazardCode }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(currentHazard.status)" size="small">{{ currentHazard.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="隐患描述" :span="2">{{ currentHazard.hazardDesc }}</el-descriptions-item>
          <el-descriptions-item label="位置">{{ currentHazard.location }}</el-descriptions-item>
          <el-descriptions-item label="等级">
            <el-tag :type="getLevelType(currentHazard.level)" size="small">{{ currentHazard.level }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="归属提交人">{{ accountName(currentHazard.ownerAccount) }}（{{ currentHazard.ownerAccount }}）</el-descriptions-item>
          <el-descriptions-item label="归属复查人">{{ accountName(currentHazard.reviewerAccount) }}（{{ currentHazard.reviewerAccount }}）</el-descriptions-item>
        </el-descriptions>

        <!-- 提交人操作区 -->
        <template v-if="!processReadonly && isSubmitter && currentHazard.ownerAccount === currentAccount">
          <el-alert
            v-if="currentHazard.status === '待整改'"
            type="warning"
            :closable="false"
            show-icon
            class="mt-15"
            title="该隐患待整改：请填写整改说明并上传整改附件后提交复查；无附件不允许提交。"
          />
          <el-alert
            v-else-if="currentHazard.status === '待复查'"
            type="info"
            :closable="false"
            show-icon
            class="mt-15"
            title="该隐患已提交复查，提交人不能自行审核，仅可继续补充材料。"
          />
          <el-alert
            v-else
            type="success"
            :closable="false"
            show-icon
            class="mt-15"
            title="该隐患已复查通过并闭环，无需再处理。"
          />

          <!-- 待整改：提交整改 -->
          <el-form
            v-if="currentHazard.status === '待整改'"
            label-width="90px"
            class="mt-15"
            @submit.prevent
          >
            <el-form-item label="整改说明" required>
              <el-input
                v-model="rectForm.opinion"
                type="textarea"
                :rows="3"
                placeholder="请说明整改措施、整改结果"
              />
            </el-form-item>
            <el-form-item label="整改附件" required>
              <el-upload
                v-model:file-list="rectFiles"
                :auto-upload="false"
                :limit="5"
                multiple
              >
                <el-button type="primary" size="small">点击上传整改照片/文档</el-button>
                <template #tip>
                  <div class="el-upload__tip">支持图片、文档等，至少上传 1 个附件，否则复查将被拒绝</div>
                </template>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitLoading" @click="submitRectification">提交整改，送复查</el-button>
            </el-form-item>
          </el-form>

          <!-- 待复查：仅补充材料 -->
          <el-form
            v-else-if="currentHazard.status === '待复查'"
            label-width="90px"
            class="mt-15"
            @submit.prevent
          >
            <el-form-item label="补充说明" required>
              <el-input
                v-model="supplementForm.opinion"
                type="textarea"
                :rows="2"
                placeholder="复查等待期间如需追加说明，请在此填写"
              />
            </el-form-item>
            <el-form-item label="补充附件" required>
              <el-upload
                v-model:file-list="supplementFiles"
                :auto-upload="false"
                :limit="5"
                multiple
              >
                <el-button size="small">点击上传补充材料</el-button>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="warning" plain :loading="submitLoading" @click="submitSupplement">补充材料</el-button>
            </el-form-item>
          </el-form>
        </template>

        <el-divider content-position="left">处理记录（历史意见只追加、不可覆盖）</el-divider>
        <el-timeline v-if="orderedRecords.length">
          <el-timeline-item
            v-for="rec in orderedRecords"
            :key="rec.id"
            :timestamp="`${rec.time} · ${rec.operator}（${rec.account}）`"
            placement="top"
            :type="getRecordType(rec.type)"
          >
            <div class="record-head">
              <el-tag :type="getRecordType(rec.type)" size="small">{{ rec.type }}</el-tag>
            </div>
            <div class="record-opinion">{{ rec.opinion }}</div>
            <div v-if="rec.attachments.length" class="record-attachments">
              <span class="attach-label">附件：</span>
              <el-tag
                v-for="(file, idx) in rec.attachments"
                :key="idx"
                size="small"
                type="info"
                class="mr-5"
              >
                <el-icon><Paperclip /></el-icon>&nbsp;{{ file.name }}
              </el-tag>
            </div>
            <div v-else class="record-no-attachment">无附件</div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无处理记录" :image-size="60" />
      </template>
      <template #footer>
        <el-button @click="processVisible = false">返回列表</el-button>
      </template>
    </el-dialog>

    <!-- 复查弹窗（仅归属复查人可提交，其他操作在弹窗内拒绝） -->
    <el-dialog
      v-model="reviewVisible"
      :title="`隐患复查 - ${currentHazard?.hazardCode || ''}`"
      width="700px"
      :close-on-click-modal="false"
      @closed="currentHazard = null"
    >
      <template v-if="currentHazard">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="隐患编号">{{ currentHazard.hazardCode }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(currentHazard.status)" size="small">{{ currentHazard.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="隐患描述" :span="2">{{ currentHazard.hazardDesc }}</el-descriptions-item>
          <el-descriptions-item label="位置">{{ currentHazard.location }}</el-descriptions-item>
          <el-descriptions-item label="等级">
            <el-tag :type="getLevelType(currentHazard.level)" size="small">{{ currentHazard.level }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="归属提交人">
            {{ accountName(currentHazard.ownerAccount) }}（{{ currentHazard.ownerAccount }}）
          </el-descriptions-item>
          <el-descriptions-item label="归属复查人">
            {{ accountName(currentHazard.reviewerAccount) }}（{{ currentHazard.reviewerAccount }}）
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="reviewError"
          :title="reviewError"
          type="error"
          show-icon
          :closable="false"
          class="mt-15"
        />

        <el-divider content-position="left">整改 / 补充材料</el-divider>
        <div v-if="reviewMaterials.length" class="material-list">
          <div v-for="rec in reviewMaterials" :key="rec.id" class="material-item">
            <div>
              <el-tag :type="getRecordType(rec.type)" size="small" class="mr-5">{{ rec.type }}</el-tag>
              <span class="material-meta">{{ rec.time }} · {{ rec.operator }}（{{ rec.account }}）</span>
            </div>
            <div class="record-opinion">{{ rec.opinion }}</div>
            <div v-if="rec.attachments.length">
              <span class="attach-label">附件：</span>
              <el-tag
                v-for="(file, idx) in rec.attachments"
                :key="idx"
                size="small"
                type="info"
                class="mr-5"
              >
                <el-icon><Paperclip /></el-icon>&nbsp;{{ file.name }}
              </el-tag>
            </div>
            <div v-else class="text-danger">该次提交未上传附件</div>
          </div>
        </div>
        <el-empty v-else description="暂无整改材料" :image-size="60" />

        <el-form label-width="90px" class="mt-15" @submit.prevent>
          <el-form-item label="复查结论" required>
            <el-radio-group v-model="reviewForm.result">
              <el-radio label="通过">复查通过，闭环销项</el-radio>
              <el-radio label="驳回">驳回，退回提交人重新整改</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="复查意见" required>
            <el-input
              v-model="reviewForm.opinion"
              type="textarea"
              :rows="3"
              placeholder="请填写复查意见；通过则隐患闭环，驳回则退回待整改并保留全部历史意见"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitReview">提交复查结论</el-button>
      </template>
    </el-dialog>

    <!-- 新增隐患弹窗（仅提交人） -->
    <el-dialog
      v-model="createVisible"
      title="新增隐患"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form label-width="90px" @submit.prevent>
        <el-form-item label="隐患描述" required>
          <el-input v-model="createForm.hazardDesc" type="textarea" :rows="3" placeholder="请描述隐患情况" />
        </el-form-item>
        <el-form-item label="位置" required>
          <el-input v-model="createForm.location" placeholder="如：A井场" />
        </el-form-item>
        <el-form-item label="风险等级" required>
          <el-select v-model="createForm.level">
            <el-option label="高" value="高" />
            <el-option label="中" value="中" />
            <el-option label="低" value="低" />
          </el-select>
        </el-form-item>
        <el-form-item label="发现日期" required>
          <el-date-picker v-model="createForm.foundDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">登记上报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, type UploadUserFile } from 'element-plus'
import * as echarts from 'echarts'

// ---- 账号与角色（演示环境下在页内切换；提交人 / 复查人 / 管理员） ----
type RoleKey = 'submitter' | 'reviewer' | 'admin'
type HazardStatus = '待整改' | '待复查' | '已整改'
type RiskLevel = '高' | '中' | '低'
type RecordType = '登记' | '整改' | '补充' | '复查通过' | '复查驳回'

interface Account {
  account: string
  name: string
  role: RoleKey
}

interface AttachmentFile {
  name: string
}

interface ProcessRecord {
  seq: number
  id: string
  time: string
  account: string
  operator: string
  type: RecordType
  opinion: string
  attachments: AttachmentFile[]
}

interface Hazard {
  hazardCode: string
  hazardDesc: string
  location: string
  level: RiskLevel
  status: HazardStatus
  foundDate: string
  ownerAccount: string
  reviewerAccount: string
  records: ProcessRecord[]
}

const accounts: Account[] = [
  { account: 'zhangwei', name: '张伟（隐患提交人）', role: 'submitter' },
  { account: 'liuna', name: '刘娜（隐患复查人）', role: 'reviewer' },
  { account: 'admin', name: '系统管理员', role: 'admin' }
]

const currentAccount = ref('zhangwei')
const currentAccountInfo = computed(
  () => accounts.find(a => a.account === currentAccount.value) || accounts[0]
)
const isSubmitter = computed(() => currentAccountInfo.value.role === 'submitter')
const isReviewer = computed(() => currentAccountInfo.value.role === 'reviewer')
const isAdmin = computed(() => currentAccountInfo.value.role === 'admin')

const roleHint = computed(() => {
  if (isSubmitter.value) return '提交人：登记隐患、提交整改、补充材料'
  if (isReviewer.value) return '复查人：仅对待复查隐患进行审核'
  return '管理员：仅查看受控汇总与处理记录'
})
const roleTagType = computed(() => {
  if (isSubmitter.value) return 'warning'
  if (isReviewer.value) return 'success'
  return 'info'
})

const accountName = (acc: string) => accounts.find(a => a.account === acc)?.name || acc

// ---- 隐患唯一数据源：列表与统计均从它派生，避免状态与统计对不上 ----
let recordSeq = 100
const formatNow = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const hazardList = ref<Hazard[]>([
  {
    hazardCode: 'HZ-2024001', hazardDesc: '井场消防器材过期', location: 'A井场', level: '高',
    status: '待整改', foundDate: '2024-01-10', ownerAccount: 'zhangwei', reviewerAccount: 'liuna',
    records: [
      { seq: 1, id: 'R1', time: '2024-01-10 09:20', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '登记', opinion: '日常巡检发现灭火器已过校验期，需立即更换。', attachments: [] }
    ]
  },
  {
    hazardCode: 'HZ-2024002', hazardDesc: '安全护栏损坏', location: 'B井场', level: '中',
    status: '待复查', foundDate: '2024-01-12', ownerAccount: 'zhangwei', reviewerAccount: 'liuna',
    records: [
      { seq: 2, id: 'R2', time: '2024-01-12 10:05', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '登记', opinion: '二层平台护栏一处焊点开裂，存在坠落风险。', attachments: [] },
      { seq: 3, id: 'R3', time: '2024-01-13 16:40', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '整改', opinion: '已重新焊接加固并刷防锈漆，验收合格。', attachments: [{ name: '护栏整改后照片.jpg' }, { name: '动火作业票.pdf' }] }
    ]
  },
  {
    hazardCode: 'HZ-2024003', hazardDesc: '电气线路老化', location: 'C井场', level: '高',
    status: '已整改', foundDate: '2024-01-08', ownerAccount: 'zhangwei', reviewerAccount: 'liuna',
    records: [
      { seq: 4, id: 'R4', time: '2024-01-08 08:50', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '登记', opinion: '值班房外接电缆外皮龟裂，存在漏电风险。', attachments: [] },
      { seq: 5, id: 'R5', time: '2024-01-09 11:30', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '整改', opinion: '已更换整段电缆并加装防护套管。', attachments: [{ name: '电缆更换验收单.pdf' }] },
      { seq: 6, id: 'R6', time: '2024-01-09 15:00', account: 'liuna', operator: '刘娜（隐患复查人）', type: '复查通过', opinion: '现场复核整改到位，绝缘检测合格，同意闭环。', attachments: [] }
    ]
  },
  {
    hazardCode: 'HZ-2024004', hazardDesc: '应急照明故障', location: 'D井场', level: '低',
    status: '待复查', foundDate: '2024-01-15', ownerAccount: 'zhangwei', reviewerAccount: 'liuna',
    records: [
      { seq: 7, id: 'R7', time: '2024-01-15 20:10', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '登记', opinion: '夜班巡检发现两处应急照明灯不亮。', attachments: [] },
      { seq: 8, id: 'R8', time: '2024-01-16 09:30', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '整改', opinion: '已更换灯泡，但整改照片尚未整理上传。', attachments: [] }
    ]
  },
  {
    hazardCode: 'HZ-2024005', hazardDesc: '防护用品不足', location: 'E井场', level: '中',
    status: '待整改', foundDate: '2024-01-05', ownerAccount: 'zhangwei', reviewerAccount: 'liuna',
    records: [
      { seq: 9, id: 'R9', time: '2024-01-05 14:00', account: 'zhangwei', operator: '张伟（隐患提交人）', type: '登记', opinion: '正压式呼吸器气瓶压力不足，数量低于配备标准。', attachments: [] }
    ]
  }
])

// 未闭环隐患才计入风险，状态一变更统计立即联动
const openHazards = computed(() => hazardList.value.filter(h => h.status !== '已整改'))
const stats = computed(() => ({
  riskCount: openHazards.value.length,
  highRisk: openHazards.value.filter(h => h.level === '高').length,
  mediumRisk: openHazards.value.filter(h => h.level === '中').length,
  lowRisk: openHazards.value.filter(h => h.level === '低').length
}))

const adminSummary = computed(() => ({
  total: hazardList.value.length,
  pendingRectification: hazardList.value.filter(h => h.status === '待整改').length,
  pendingReview: hazardList.value.filter(h => h.status === '待复查').length,
  closed: hazardList.value.filter(h => h.status === '已整改').length,
  highRisk: stats.value.highRisk,
  mediumRisk: stats.value.mediumRisk,
  lowRisk: stats.value.lowRisk,
  openTotal: stats.value.riskCount
}))

const getLevelType = (level: string) => {
  const map: Record<string, string> = { '高': 'danger', '中': 'warning', '低': 'info' }
  return map[level] || 'info'
}
const getStatusType = (status: string) => {
  const map: Record<string, string> = { '待整改': 'warning', '待复查': 'primary', '已整改': 'success' }
  return map[status] || 'info'
}
const getRecordType = (type: RecordType) => {
  const map: Record<RecordType, string> = {
    '登记': 'info',
    '整改': 'primary',
    '补充': 'primary',
    '复查通过': 'success',
    '复查驳回': 'danger'
  }
  return map[type]
}

// ---- 追加式处理记录：任何角色的意见都只 push，不改写历史 ----
const addRecord = (
  hazard: Hazard,
  data: { type: RecordType; opinion: string; attachments: AttachmentFile[] }
) => {
  recordSeq += 1
  hazard.records.push({
    seq: recordSeq,
    id: `R${recordSeq}`,
    time: formatNow(),
    account: currentAccount.value,
    operator: currentAccountInfo.value.name,
    type: data.type,
    opinion: data.opinion,
    attachments: data.attachments
  })
}

const ownershipText = (h: Hazard) =>
  `隐患归属：提交人 ${accountName(h.ownerAccount)}（${h.ownerAccount}）、复查人 ${accountName(h.reviewerAccount)}（${h.reviewerAccount}）。`

// ---- 处理弹窗 ----
const processVisible = ref(false)
const processReadonly = ref(false)
const submitLoading = ref(false)
const currentHazard = ref<Hazard | null>(null)

const rectForm = reactive({ opinion: '' })
const supplementForm = reactive({ opinion: '' })
const rectFiles = ref<UploadUserFile[]>([])
const supplementFiles = ref<UploadUserFile[]>([])

const orderedRecords = computed(() =>
  currentHazard.value
    ? [...currentHazard.value.records].sort((a, b) => b.seq - a.seq)
    : []
)

const resetProcessForms = () => {
  rectForm.opinion = ''
  supplementForm.opinion = ''
  rectFiles.value = []
  supplementFiles.value = []
}

const openProcess = (row: Hazard) => {
  // 防御性越权校验（正常情况下按钮仅归属提交人可见）
  if (!isSubmitter.value || row.ownerAccount !== currentAccount.value) {
    ElMessage.error({
      message: `越权操作：隐患 ${row.hazardCode} 仅归属提交人可处理。${ownershipText(row)}`,
      duration: 6000
    })
    return
  }
  currentHazard.value = row
  processReadonly.value = false
  resetProcessForms()
  processVisible.value = true
}

const openRecords = (row: Hazard) => {
  currentHazard.value = row
  processReadonly.value = true
  resetProcessForms()
  processVisible.value = true
}

const toAttachments = (files: UploadUserFile[]): AttachmentFile[] =>
  files.map(f => ({ name: f.name }))

const submitRectification = () => {
  const h = currentHazard.value
  if (!h) return
  if (!isSubmitter.value || h.ownerAccount !== currentAccount.value) {
    ElMessage.error({ message: `越权操作：仅隐患归属提交人可提交整改。${ownershipText(h)}`, duration: 6000 })
    return
  }
  if (h.status !== '待整改') {
    ElMessage.error({ message: `隐患当前为【${h.status}】，不能重复提交整改。${ownershipText(h)}`, duration: 6000 })
    return
  }
  if (!rectFiles.value.length) {
    ElMessage.error({ message: `隐患 ${h.hazardCode} 未上传整改附件，不能提交复查。${ownershipText(h)}`, duration: 6000 })
    return
  }
  if (!rectForm.opinion.trim()) {
    ElMessage.error('请填写整改说明。')
    return
  }
  h.status = '待复查'
  addRecord(h, { type: '整改', opinion: rectForm.opinion.trim(), attachments: toAttachments(rectFiles.value) })
  ElMessage.success('整改材料已提交，等待归属复查人审核。')
  // 弹窗保持打开，时间线实时出现新记录；清空表单避免旧结果残留
  rectForm.opinion = ''
  rectFiles.value = []
}

const submitSupplement = () => {
  const h = currentHazard.value
  if (!h) return
  if (!isSubmitter.value || h.ownerAccount !== currentAccount.value) {
    ElMessage.error({ message: `越权操作：仅隐患归属提交人可补充材料。${ownershipText(h)}`, duration: 6000 })
    return
  }
  if (h.status !== '待复查') {
    ElMessage.error({ message: `隐患当前为【${h.status}】，不能补充材料。${ownershipText(h)}`, duration: 6000 })
    return
  }
  if (!supplementFiles.value.length) {
    ElMessage.error({ message: `补充材料至少上传 1 个附件。${ownershipText(h)}`, duration: 6000 })
    return
  }
  if (!supplementForm.opinion.trim()) {
    ElMessage.error('请填写补充说明。')
    return
  }
  addRecord(h, { type: '补充', opinion: supplementForm.opinion.trim(), attachments: toAttachments(supplementFiles.value) })
  ElMessage.success('补充材料已追加，隐患状态保持待复查。')
  supplementForm.opinion = ''
  supplementFiles.value = []
}

// ---- 复查弹窗 ----
const reviewVisible = ref(false)
const reviewError = ref('')
const reviewForm = reactive<{ result: '' | '通过' | '驳回'; opinion: string }>({ result: '', opinion: '' })

const reviewMaterials = computed(() =>
  currentHazard.value
    ? currentHazard.value.records.filter(r => r.type === '整改' || r.type === '补充')
    : []
)
const hasMaterialAttachment = computed(() =>
  reviewMaterials.value.some(r => r.attachments.length > 0)
)

const openReview = (row: Hazard) => {
  // 统一在弹窗内受理并给出拒绝原因（含隐患归属），此处只负责打开
  currentHazard.value = row
  reviewForm.result = ''
  reviewForm.opinion = ''
  reviewError.value = ''
  reviewVisible.value = true
}

const rejectReview = (msg: string) => {
  reviewError.value = msg
  ElMessage.error({ message: msg, duration: 6000 })
}

const submitReview = () => {
  const h = currentHazard.value
  if (!h) return
  reviewError.value = ''

  // 1. 越权：仅具备复查权限且为该隐患归属复查人的账号可审核
  if (!isReviewer.value || currentAccount.value !== h.reviewerAccount) {
    rejectReview(`复查被拒绝：当前账号无该隐患的复查权限。${ownershipText(h)}`)
    return
  }
  // 2. 重复复查：已闭环隐患不允许再次复查
  if (h.status === '已整改') {
    const passed = h.records.filter(r => r.type === '复查通过').slice(-1)[0]
    rejectReview(
      `复查被拒绝：该隐患已完成复查（${passed ? `${passed.time} 由 ${passed.operator} 复查通过` : ''}），不能重复复查。${ownershipText(h)}`
    )
    return
  }
  // 3. 状态不符：待整改隐患尚未送复查
  if (h.status !== '待复查') {
    rejectReview(`复查被拒绝：隐患当前为【${h.status}】，提交人尚未提交整改材料。${ownershipText(h)}`)
    return
  }
  // 4. 无附件：整改/补充材料中没有任何附件
  if (!hasMaterialAttachment.value) {
    rejectReview(`复查被拒绝：提交人未上传任何整改附件，材料不完整，请通知归属提交人补充。${ownershipText(h)}`)
    return
  }
  if (!reviewForm.result) {
    rejectReview('请选择复查结论（通过 / 驳回）。')
    return
  }
  if (!reviewForm.opinion.trim()) {
    rejectReview('请填写复查意见。')
    return
  }

  if (reviewForm.result === '通过') {
    h.status = '已整改'
    addRecord(h, { type: '复查通过', opinion: reviewForm.opinion.trim(), attachments: [] })
    ElMessage.success('复查通过，隐患已闭环；列表状态与风险统计已同步更新。')
  } else {
    h.status = '待整改'
    addRecord(h, { type: '复查驳回', opinion: reviewForm.opinion.trim(), attachments: [] })
    ElMessage.success('已驳回并退回归属提交人重新整改，历史意见全部保留。')
  }
  reviewVisible.value = false
}

// ---- 新增隐患 ----
const createVisible = ref(false)
let hazardSeq = 6
const createForm = reactive({
  hazardDesc: '',
  location: '',
  level: '中' as RiskLevel,
  foundDate: new Date().toISOString().slice(0, 10)
})

const openCreateDialog = () => {
  if (!isSubmitter.value) {
    ElMessage.error('仅提交人账号可登记隐患。')
    return
  }
  createForm.hazardDesc = ''
  createForm.location = ''
  createForm.level = '中'
  createForm.foundDate = new Date().toISOString().slice(0, 10)
  createVisible.value = true
}

const submitCreate = () => {
  if (!createForm.hazardDesc.trim()) {
    ElMessage.error('请输入隐患描述。')
    return
  }
  if (!createForm.location.trim()) {
    ElMessage.error('请输入隐患位置。')
    return
  }
  if (!createForm.foundDate) {
    ElMessage.error('请选择发现日期。')
    return
  }
  const code = `HZ-2024${String(hazardSeq++).padStart(3, '0')}`
  const hazard: Hazard = {
    hazardCode: code,
    hazardDesc: createForm.hazardDesc.trim(),
    location: createForm.location.trim(),
    level: createForm.level,
    status: '待整改',
    foundDate: createForm.foundDate,
    ownerAccount: currentAccount.value,
    reviewerAccount: 'liuna',
    records: []
  }
  addRecord(hazard, { type: '登记', opinion: '隐患登记上报，待整改。', attachments: [] })
  hazardList.value.unshift(hazard)
  createVisible.value = false
  ElMessage.success(`隐患 ${code} 已登记。`)
}

// ---- 图表 ----
const monitorChart = ref<HTMLElement>()
const riskChart = ref<HTMLElement>()
let riskChartInst: echarts.ECharts | null = null

const renderRiskChart = () => {
  if (!riskChartInst) return
  riskChartInst.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      name: '未闭环风险',
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: stats.value.highRisk, name: '高风险', itemStyle: { color: '#ef4444' } },
        { value: stats.value.mediumRisk, name: '中风险', itemStyle: { color: '#f59e0b' } },
        { value: stats.value.lowRisk, name: '低风险', itemStyle: { color: '#3b82f6' } }
      ],
      label: { formatter: '{b}: {c} ({d}%)' }
    }]
  })
}

const initMonitorChart = () => {
  if (!monitorChart.value) return
  const chart = echarts.init(monitorChart.value)
  const times = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`)

  chart.setOption({
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
  window.addEventListener('resize', () => chart.resize())
}

const initRiskChart = () => {
  if (!riskChart.value) return
  riskChartInst = echarts.init(riskChart.value)
  renderRiskChart()
  window.addEventListener('resize', () => riskChartInst?.resize())
}

// 隐患状态变化 -> 统计变化 -> 饼图联动，始终同源
watch(stats, () => renderRiskChart(), { deep: true })

onMounted(() => {
  initMonitorChart()
  initRiskChart()
})
</script>

<style scoped lang="scss">
.hse-container {
  width: 100%;
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
    .stat-value {
      color: #ef4444;
    }
    .stat-icon {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
  }

  &.medium {
    .stat-value {
      color: #f59e0b;
    }
    .stat-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }
  }

  &.low {
    .stat-value {
      color: #3b82f6;
    }
    .stat-icon {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 400;
}

.chart-large {
  width: 100%;
  height: 300px;
}

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

.mt-15 {
  margin-top: 15px;
}

.mr-5 {
  margin-right: 5px;
}

.record-head {
  margin-bottom: 4px;
}

.record-opinion {
  margin: 4px 0;
  color: #334155;
  line-height: 1.6;
}

.record-attachments,
.record-no-attachment {
  margin-top: 4px;
  font-size: 13px;
}

.record-no-attachment,
.attach-label {
  color: #94a3b8;
}

.material-list {
  max-height: 220px;
  overflow-y: auto;
}

.material-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;

  .material-meta {
    font-size: 12px;
    color: #94a3b8;
  }
}

.text-danger {
  color: #ef4444;
}

.text-warning {
  color: #f59e0b;
}

.text-success {
  color: #67c23a;
}

.text-primary {
  color: #3b82f6;
}
</style>
