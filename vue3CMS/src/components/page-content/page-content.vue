<template>
  <div class="content">
    <div class="header">
      <h2 class="title">{{ contentConfig.header.title }}</h2>
      <el-button type="primary" @click="newBtnClick" v-if="isCreate">{{
        contentConfig.header.btnTitle ?? '新建数据'
      }}</el-button>
    </div>
    <div class="list">
      <el-table :data="pageList" style="width: 100%; height: 450px" border lazy row-key="id">
        <!-- 可以是菜单树 -->
        <template v-for="item in contentConfig.propsList" :key="item.prop">
          <template v-if="item.type === 'timer'">
            <el-table-column align="center" prop="createAt" label="创建时间">
              <template #default="scope">
                {{ formatUTC(scope.row[item.prop]) }}
              </template>
            </el-table-column>
          </template>
          <template v-else-if="item.type === 'handler'">
            <el-table-column align="center" fixed="right" :label="item.label" width="150px">
              <template #default="scope">
                <el-button
                  text
                  size="small"
                  icon="Edit"
                  type="primary"
                  @click="handleEditClick(scope.row)"
                  v-if="isUpdate"
                  >编辑</el-button
                >
                <el-button
                  text
                  size="small"
                  icon="Delete"
                  type="danger"
                  @click="handleDeleteClick(scope.row.id)"
                  v-if="isDelete"
                  >删除</el-button
                >
              </template>
            </el-table-column>
          </template>
          <!-- 作用域插槽自己定义内容 -->
          <template v-else-if="item.type === 'custom'">
            <el-table-column align="center" :label="item.label" width="150px">
              <template #default="scope">
                <!-- 传给父组件的插槽 -->
                <slot :name="item.slotName" v-bind="scope"></slot>
              </template>
            </el-table-column>
          </template>
          <template v-else>
            <el-table-column align="center" v-bind="item" />
          </template>
        </template>
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
//导入配置文件
const { contentConfig } = defineProps(['contentConfig'])
import { usePermissions } from '@/hooks/usePermissions'
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

//查看是否有权限
const isCreate = usePermissions(`${contentConfig.pageName}:create`)
const isUpdate = usePermissions(`${contentConfig.pageName}:update`)
const isDelete = usePermissions(`${contentConfig.pageName}:delete`)

//#region编辑，删除功能
function handleEditClick(currentUser: number) {
  emit('editClick', currentUser)
}
function handleDeleteClick(id: number) {
  deletePageAction(contentConfig.pageName, id)
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
//*监听systemStore中action被执行
systemStore.$onAction(({ name, after }) => {
  //成功执行后运行的代码
  after(() => {
    if (
      name === 'deletePageAction' ||
      name === 'editPageDataAction' ||
      name === 'newPageDataAction'
    ) {
      console.log(name)
      currentPage.value = 1
    }
  })
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
  postPageListAction(contentConfig.pageName, info)
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
