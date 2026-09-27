"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Clock, Loader2 } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

function OperationLogContent() {
  const { token } = useAuth()
  const [selectedSite, setSelectedSite] = useState("all")
  const [selectedMachine, setSelectedMachine] = useState("")
  const [logDate, setLogDate] = useState(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().split("T")[0]
  })
  const [totalTime, setTotalTime] = useState("")
  const [engineer, setEngineer] = useState("")
  const [notOperatedReason, setNotOperatedReason] = useState("")
  const [maintenanceCompleted, setMaintenanceCompleted] = useState(false)
  const [weeklyChecklistCompleted, setWeeklyChecklistCompleted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Real data from API
  const [sites, setSites] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [operationLogs, setOperationLogs] = useState<any[]>([])

  // Fetch sites and machines on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        const [sitesData, machinesData, logsData] = await Promise.all([
          apiService.getSites(token),
          apiService.getMachines(token),
          apiService.getOperationLogs(token)
        ])
        
        setSites(sitesData)
        setMachines(machinesData)
        setOperationLogs(logsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to fetch data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token])

  const filteredMachines = selectedSite === "all" 
    ? machines 
    : machines.filter(m => m.siteId === selectedSite)

  const filteredLogs = selectedSite === "all" 
    ? operationLogs 
    : operationLogs.filter(log => {
        const machine = machines.find(m => m.id === log.machineId)
        return machine && machine.siteId === selectedSite
      })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalHours = parseFloat(totalTime)

    if (!selectedMachine || !logDate || !totalTime || Number.isNaN(totalHours) || totalHours < 0 || !engineer) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      await apiService.createOperationLog(token!, {
        machineId: selectedMachine,
        date: logDate,
        totalHours,
        engineer,
        notOperatedReason: notOperatedReason || undefined,
        maintenanceChecklistCompleted: maintenanceCompleted,
        weeklyChecklistCompleted: weeklyChecklistCompleted
      })

      // Refresh operation logs
      const updatedLogs = await apiService.getOperationLogs(token!)
      setOperationLogs(updatedLogs)

      // Reset form
      setTotalTime("")
      setEngineer("")
      setNotOperatedReason("")
      setMaintenanceCompleted(false)
      setWeeklyChecklistCompleted(false)

      toast({
        title: "Success",
        description: "Operation log created successfully.",
      })
    } catch (error) {
      console.error('Error creating operation log:', error)
      toast({
        title: "Error",
        description: "Failed to create operation log. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Operation Log Entry</h2>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Operation Entry</CardTitle>
            <CardDescription>Record daily machine operation data</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Select value={selectedSite} onValueChange={value => { setSelectedSite(value); setSelectedMachine("") }}>
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
                <Label htmlFor="machine">Machine</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMachines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name} - {sites.find(s => s.id === machine.siteId)?.name || 'Unknown Site'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-date">Date</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-time">Total Time (hours)</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="total-time"
                    type="number"
                    min="0"
                    step="0.1"
                    value={totalTime}
                    onChange={(e) => setTotalTime(e.target.value)}
                    placeholder="Enter total hours"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="engineer">Engineer Name</Label>
                <Input
                  id="engineer"
                  value={engineer}
                  onChange={(e) => setEngineer(e.target.value)}
                  placeholder="Enter engineer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="not-operated-reason">Reason if Not Operated (Optional)</Label>
                <Textarea
                  id="not-operated-reason"
                  value={notOperatedReason}
                  onChange={(e) => setNotOperatedReason(e.target.value)}
                  placeholder="Enter reason if machine was not operated"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maintenance-completed"
                  checked={maintenanceCompleted}
                  onCheckedChange={(checked) => setMaintenanceCompleted(checked as boolean)}
                />
                <Label htmlFor="maintenance-completed">Maintenance checklist completed</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weekly-checklist-completed"
                  checked={weeklyChecklistCompleted}
                  onCheckedChange={(checked) => setWeeklyChecklistCompleted(checked as boolean)}
                />
                <Label htmlFor="weekly-checklist-completed">Weekly checklist completed</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Operation Log"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Operation Logs</CardTitle>
            <CardDescription>Latest operation entries</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Maintenance</TableHead>
                  <TableHead>Weekly</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No operation logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {machines.find(m => m.id === log.machineId)?.name || 'Unknown Machine'}
                      </TableCell>
                      <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                      <TableCell>{log.totalHours}h</TableCell>
                      <TableCell>
                        <Badge variant={log.maintenanceChecklistCompleted ? "default" : "secondary"}>
                          {log.maintenanceChecklistCompleted ? "Complete" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.weeklyChecklistCompleted ? "default" : "secondary"}>
                          {log.weeklyChecklistCompleted ? "Complete" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function OperationLogPage() {
  return (
    <ProtectedRoute>
      <OperationLogContent />
    </ProtectedRoute>
  )
}
