"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Filter } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import React from "react"

function ReportsContent() {
  const { token } = useAuth()
  const [sites, setSites] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [operationLogs, setOperationLogs] = useState<any[]>([])
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState("")
  const [selectedMachine, setSelectedMachine] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Fetch all data on mount or when filters change
  useEffect(() => {
    if (!token) return
    setLoading(true)
    const fetchData = async () => {
      try {
        const [sitesData, machinesData, logsData, tasksData] = await Promise.all([
          apiService.getSites(token),
          apiService.getMachines(token),
          apiService.getOperationLogs(token, {
            siteId: selectedSite && selectedSite !== "all" ? selectedSite : undefined,
            machineId: selectedMachine && selectedMachine !== "all" ? selectedMachine : undefined,
            startDate: dateFrom || undefined,
            endDate: dateTo || undefined,
          }),
          apiService.getMaintenanceTasks(token, {
            siteId: selectedSite && selectedSite !== "all" ? selectedSite : undefined,
            machineId: selectedMachine && selectedMachine !== "all" ? selectedMachine : undefined,
          })
        ])
        setSites(sitesData)
        setMachines(machinesData)
        setOperationLogs(logsData)
        setMaintenanceTasks(tasksData)
      } catch (e) {
        // TODO: error handling
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token, selectedSite, selectedMachine, dateFrom, dateTo])

  const handleExport = () => {
    // Handle export functionality
    console.log("Exporting report...")
  }

  // Helper: get filtered machines for dropdown, grouped and sorted by site
  const groupedMachines = (() => {
    // Map siteId to site object for easy lookup
    const siteMap = Object.fromEntries(sites.map(site => [site.id, site]))
    // Filter and sort machines
    const machinesToShow = selectedSite && selectedSite !== "all"
      ? machines.filter(m => m.siteId === selectedSite)
      : machines
    // Group machines by siteId
    const groups: Record<string, any[]> = {}
    machinesToShow.forEach(machine => {
      if (!groups[machine.siteId]) groups[machine.siteId] = []
      groups[machine.siteId].push(machine)
    })
    // Sort sites alphabetically
    const sortedSiteIds = Object.keys(groups).sort((a, b) => {
      const siteA = siteMap[a]?.name || ''
      const siteB = siteMap[b]?.name || ''
      return siteA.localeCompare(siteB)
    })
    // Sort machines within each site
    sortedSiteIds.forEach(siteId => {
      groups[siteId].sort((a, b) => a.name.localeCompare(b.name))
    })
    return { groups, sortedSiteIds, siteMap }
  })()

  // Helper: operation summary (actual vs desired hours)
  const operationSummary = machines.map(machine => {
    // Sum totalHours from operationLogs for this machine
    const logs = operationLogs.filter(log => log.machineId === machine.id)
    const actualHours = logs.reduce((sum, log) => sum + (log.totalHours || 0), 0)
    const desiredHours = (machine.desiredDailyHours || 0) * 20 // 20 working days/month
    const efficiency = desiredHours > 0 ? Math.round((actualHours / desiredHours) * 100) : 0
    return {
      ...machine,
      actualHours,
      desiredHours,
      efficiency
    }
  })

  // Helper: weekly usage trend (group operationLogs by day)
  const usageTrend = (() => {
    const trend: Record<string, number> = {}
    operationLogs.forEach(log => {
      const day = new Date(log.date).toLocaleDateString()
      trend[day] = (trend[day] || 0) + (log.totalHours || 0)
    })
    return Object.entries(trend).map(([name, hours]) => ({ name, hours }))
  })()

  // Helper: downtime reasons (group by notOperatedReason)
  const downtimeReasons = (() => {
    const reasonMap: Record<string, { count: number; hours: number }> = {}
    operationLogs.forEach(log => {
      if (log.notOperatedReason) {
        if (!reasonMap[log.notOperatedReason]) reasonMap[log.notOperatedReason] = { count: 0, hours: 0 }
        reasonMap[log.notOperatedReason].count++
        reasonMap[log.notOperatedReason].hours += log.totalHours || 0
      }
    })
    const total = Object.values(reasonMap).reduce((sum, r) => sum + r.count, 0)
    return Object.entries(reasonMap).map(([reason, { count, hours }]) => ({
      reason,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      hours
    }))
  })()

  // Helper: downtime impact (sum hours by reason)
  const downtimeImpact = downtimeReasons.map(r => ({ reason: r.reason, hours: r.hours }))
  const totalDowntimeHours = downtimeImpact.reduce((sum, r) => sum + r.hours, 0)

  // Helper: maintenance compliance (group by month)
  const complianceByMonth = (() => {
    const monthMap: Record<string, { completed: number; pending: number }> = {}
    maintenanceTasks.forEach(task => {
      const date = task.completedDate || task.createdAt || task.updatedAt || new Date().toISOString()
      const month = new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' })
      if (!monthMap[month]) monthMap[month] = { completed: 0, pending: 0 }
      if (task.completed) monthMap[month].completed++
      else monthMap[month].pending++
    })
    return Object.entries(monthMap).map(([name, { completed, pending }]) => ({ name, completed, pending }))
  })()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="site-filter">Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-filter">Machine</Label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger>
                  <SelectValue placeholder="All Machines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Machines</SelectItem>
                  {groupedMachines.sortedSiteIds.map(siteId => (
                    <SelectGroup key={siteId}>
                      <SelectLabel>{groupedMachines.siteMap[siteId]?.name || "Unknown Site"}</SelectLabel>
                      {groupedMachines.groups[siteId].map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="operation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operation">Operation Report</TabsTrigger>
          <TabsTrigger value="downtime">Downtime Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="operation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Machine Operation Summary</CardTitle>
                <CardDescription>Actual vs Desired Hours</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Actual Hours</TableHead>
                      <TableHead>Desired Hours</TableHead>
                      <TableHead>Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operationSummary.map((machine) => (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.name}</TableCell>
                        <TableCell>{machine.actualHours}h</TableCell>
                        <TableCell>{machine.desiredHours}h</TableCell>
                        <TableCell>
                          <Badge
                            variant={machine.efficiency >= 80 ? "default" : machine.efficiency >= 60 ? "secondary" : "destructive"}
                          >
                            {machine.efficiency}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Usage Trend</CardTitle>
                <CardDescription>Average hours per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    hours: {
                      label: "Hours",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="hours" fill="var(--color-hours)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="downtime" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Downtime Reasons</CardTitle>
                <CardDescription>Most common causes of machine downtime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {downtimeReasons.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-500 rounded" />
                        <span className="text-sm">{reason.reason}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{reason.count} incidents</div>
                        <div className="text-xs text-muted-foreground">{reason.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Downtime Impact</CardTitle>
                <CardDescription>Hours lost due to downtime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{totalDowntimeHours.toFixed(1)}</div>
                    <p className="text-sm text-muted-foreground">Total hours lost this month</p>
                  </div>
                  <div className="space-y-2">
                    {downtimeImpact.map((item, idx) => (
                      <div className="flex justify-between text-sm" key={idx}>
                        <span>{item.reason}</span>
                        <span>{item.hours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Compliance</CardTitle>
              <CardDescription>Track maintenance completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  completed: {
                    label: "Completed",
                    color: "hsl(var(--chart-1))",
                  },
                  pending: {
                    label: "Pending",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" />
                    <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ReportsContent />
    </ProtectedRoute>
  )
}
