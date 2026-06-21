<template>
  <div class="content">
    <div class="header">
      <h2 class="title">部门列表</h2>
      <el-button type="primary" @click="newBtnClick">新建数据</el-button>
    </div>
    <div class="list">
      <el-table :data="pageList" style="width: 100%; height: 450px" border>
        <el-table-column align="center" type="selection" width="40px" />
        <el-table-column align="center" type="index" label="序列" width="60px" />
        <el-table-column align="center" prop="name" label="部门名称" width="150px" />
        <el-table-column align="center" prop="leader" label="部门领导" width="150px" />
        <el-table-column align="center" prop="parentId" label="上级部门" width="160px" />
        <el-table-column align="center" prop="createAt" label="创建时间">
          <template #default="scope">
            {{ formatUTC(scope.row.createAt) }}
          </template>
        </el-table-column>
        <el-table-column align="center" prop="updateAt" label="更新时间">
          <template #default="scope">
            {{ formatUTC(scope.row.updateAt) }}
          </template>
        </el-table-column>
        <el-table-column align="center" fixed="right" label="操作" width="150px">
          <template #default="scope">
            <el-button
              text
              size="small"
              icon="Edit"
              type="primary"
              @click="handleEditClick(scope.row)"
              >编辑</el-button
            >
            <el-button
              text
              size="small"
              icon="Delete"
              type="danger"
              @click="handleDeleteClick(scope.row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 40]"
          size="small"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pageTotalCount"
        />
      </div>
    </div>
  </div>
</template>

<script setup name="" lang="ts">
//#region导入模块，方法等
import useSystemStore from '@/store/main/system/system.ts'
import { formatUTC } from '@/utils/formatDate' //时间格式化
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
const systemStore = useSystemStore()
const { postPageListAction, deletePageAction } = systemStore
const { pageList, pageTotalCount } = storeToRefs(systemStore)
const emit = defineEmits(['newClick', 'editClick'])
//#endregion

//#region编辑，删除功能
function handleEditClick(currentUser: number) {
  emit('editClick', currentUser)
}
function handleDeleteClick(id: number) {
  deletePageAction('department',id)
}
//#endregion

//#region新增用户
function newBtnClick() {
  emit('newClick')
}
//#endregion
//#region分页功能
const currentPage = ref(1)
const pageSize = ref(10)
fetchPageListData() //第一次展示页面进行一次网络请求
watch([currentPage, pageSize], () => {
  fetchPageListData()
})
//#endregion

//#region获取列表数据
function fetchPageListData(queryInfo = {}) {
  const size = pageSize.value
  const offset = (currentPage.value - 1) * size
  const info = {
    //分页请求接口需要的数据
    size,
    offset,
    ...queryInfo,
  }
  postPageListAction('department', info)
}
//#endregion
defineExpose({ fetchPageListData }) //暴露网络请求给父组件
</script>

<style scoped lang="less">
.content {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #fff;
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    .title {
      font-weight: 800;
    }
  }
  .list {
    height: 500px;
    .el-table-column {
      padding: 12px 0;
    }
    .el-button {
      padding: 5px;
    }
  }
  .pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
}
</style>
