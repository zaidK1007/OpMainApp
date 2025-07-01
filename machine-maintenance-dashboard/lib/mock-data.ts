import type { Site, Machine, OperationLog, MaintenanceTask, DowntimeReason } from "./types"

export const mockSites: Site[] = [
  { id: "1", name: "Factory A", location: "New York", machineCount: 8 },
  { id: "2", name: "Factory B", location: "California", machineCount: 6 },
  { id: "3", name: "Factory C", location: "Texas", machineCount: 4 },
]

export const mockMachines: Machine[] = [
  {
    id: "1",
    name: "CNC Machine 001",
    siteId: "1",
    siteName: "Factory A",
    status: "operational",
    nextMaintenanceDate: "2024-01-15",
    lastMaintenanceDate: "2023-12-15",
    totalHoursRun: 156,
    desiredDailyHours: 8,
  },
  {
    id: "2",
    name: "Lathe Machine 002",
    siteId: "1",
    siteName: "Factory A",
    status: "under-maintenance",
    nextMaintenanceDate: "2024-01-10",
    lastMaintenanceDate: "2023-12-10",
    totalHoursRun: 89,
    desiredDailyHours: 10,
  },
  {
    id: "3",
    name: "Press Machine 003",
    siteId: "2",
    siteName: "Factory B",
    status: "operational",
    nextMaintenanceDate: "2024-01-20",
    lastMaintenanceDate: "2023-12-20",
    totalHoursRun: 134,
    desiredDailyHours: 8,
  },
  {
    id: "4",
    name: "Drill Machine 004",
    siteId: "2",
    siteName: "Factory B",
    status: "idle",
    nextMaintenanceDate: "2024-01-25",
    lastMaintenanceDate: "2023-12-25",
    totalHoursRun: 67,
    desiredDailyHours: 6,
  },
]

export const mockOperationLogs: OperationLog[] = [
  {
    id: "1",
    machineId: "1",
    machineName: "CNC Machine 001",
    date: "2024-01-08",
    startTime: "08:00",
    endTime: "16:00",
    totalHours: 8,
    engineer: "John Smith",
    operator: "Mike Johnson",
    maintenanceChecklistCompleted: true,
  },
  {
    id: "2",
    machineId: "2",
    machineName: "Lathe Machine 002",
    date: "2024-01-08",
    startTime: "09:00",
    endTime: "14:00",
    totalHours: 5,
    engineer: "Sarah Wilson",
    operator: "Tom Brown",
    notOperatedReason: "Material shortage",
    maintenanceChecklistCompleted: false,
  },
]

export const mockMaintenanceTasks: MaintenanceTask[] = [
  {
    id: "1",
    machineId: "1",
    task: "Check oil levels",
    completed: true,
    completedBy: "John Smith",
    completedDate: "2024-01-08",
    priority: "high",
  },
  {
    id: "2",
    machineId: "1",
    task: "Inspect belts and chains",
    completed: false,
    priority: "medium",
  },
  {
    id: "3",
    machineId: "1",
    task: "Clean filters",
    completed: true,
    completedBy: "Mike Johnson",
    completedDate: "2024-01-07",
    priority: "low",
  },
]

export const mockDowntimeReasons: DowntimeReason[] = [
  { reason: "Material shortage", count: 15, percentage: 35 },
  { reason: "Equipment failure", count: 12, percentage: 28 },
  { reason: "Scheduled maintenance", count: 8, percentage: 19 },
  { reason: "Power outage", count: 5, percentage: 12 },
  { reason: "Other", count: 3, percentage: 6 },
]

export const mockChartData = {
  machineUsage: [
    { name: "Mon", hours: 8.2 },
    { name: "Tue", hours: 7.8 },
    { name: "Wed", hours: 9.1 },
    { name: "Thu", hours: 6.5 },
    { name: "Fri", hours: 8.7 },
    { name: "Sat", hours: 5.2 },
    { name: "Sun", hours: 3.1 },
  ],
  maintenanceCompliance: [
    { name: "Jan", completed: 85, pending: 15 },
    { name: "Feb", completed: 92, pending: 8 },
    { name: "Mar", completed: 78, pending: 22 },
    { name: "Apr", completed: 88, pending: 12 },
  ],
}
