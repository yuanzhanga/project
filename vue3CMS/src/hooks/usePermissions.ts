import useLoginStore from '@/store/login/login'

export function usePermissions(permissionID: string): boolean {
  const { permissions } = useLoginStore()
  return !!permissions.find((item) => item.includes(permissionID))
}
