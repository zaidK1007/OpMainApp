"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2, Plus, Calendar, Clock, CalendarDays, Settings, RefreshCw } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function MaintenanceContent() {
  const { token, user } = useAuth()
  const [selectedSite, setSelectedSite] = useState("all")
  const [selectedMachine, setSelectedMachine] = useState("")
  const [completedBy, setCompletedBy] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState("daily")

  // Real data from API
  const [sites, setSites] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([])

  // New task dialog state
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState("medium")
  const [newTaskFrequency, setNewTaskFrequency] = useState("daily")

  // Fetch sites, machines, and maintenance tasks on component mount
  const fetchData = async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      const [sitesData, machinesData, tasksData] = await Promise.all([
        apiService.getSites(token),
        apiService.getMachines(token),
        apiService.getMaintenanceTasks(token)
      ])
      
      setSites(sitesData)
      setMachines(machinesData)
      setMaintenanceTasks(tasksData)
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

  useEffect(() => {
    fetchData()
  }, [token])

  const handleRefresh = async () => {
    await fetchData()
    toast({
      title: "Success",
      description: "Maintenance data refreshed successfully.",
    })
  }

  const filteredMachines = selectedSite === "all" 
    ? machines 
    : machines.filter(m => m.siteId === selectedSite)

  // Filter tasks by frequency type
  const getTasksByFrequency = (frequency: string) => {
    const baseFilteredTasks = selectedMachine && selectedMachine !== "all"
      ? maintenanceTasks.filter((task) => task.machineId === selectedMachine)
      : selectedSite === "all"
        ? maintenanceTasks
        : maintenanceTasks.filter((task) => filteredMachines.some(m => m.id === task.machineId))

    // Filter by frequency (assuming tasks have a frequency field, if not, we'll use a default)
    return baseFilteredTasks.filter(task => task.frequency === frequency || (!task.frequency && frequency === "daily"))
  }

  const dailyTasks = getTasksByFrequency("daily")
  const weeklyTasks = getTasksByFrequency("weekly")
  const yearlyTasks = getTasksByFrequency("yearly")

  const getCompletionStats = (tasks: any[]) => {
    const completedTasks = tasks.filter((task) => task.completed).length
    const totalTasks = tasks.length
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    return { completedTasks, totalTasks, completionPercentage }
  }

  const dailyStats = getCompletionStats(dailyTasks)
  const weeklyStats = getCompletionStats(weeklyTasks)
  const yearlyStats = getCompletionStats(yearlyTasks)

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!completedBy) {
      toast({
        title: "Error",
        description: "Please enter your name before completing tasks.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    
    try {
      await apiService.updateMaintenanceTask(token!, taskId, {
        completed,
        completedBy: completed ? completedBy : undefined
      })

      // Refresh maintenance tasks
      const updatedTasks = await apiService.getMaintenanceTasks(token!)
      setMaintenanceTasks(updatedTasks)

      toast({
        title: "Success",
        description: `Task ${completed ? 'completed' : 'marked as incomplete'}.`,
      })
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateTask = async () => {
    if (!selectedMachine || selectedMachine === "all") {
      toast({
        title: "Error",
        description: "Please select a specific machine to create a task for.",
        variant: "destructive",
      })
      return
    }

    if (!newTask.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task description.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    
    try {
      await apiService.createMaintenanceTask(token!, {
        machineId: selectedMachine,
        task: newTask.trim(),
        priority: newTaskPriority,
        frequency: newTaskFrequency
      })

      // Refresh maintenance tasks
      const updatedTasks = await apiService.getMaintenanceTasks(token!)
      setMaintenanceTasks(updatedTasks)

      // Reset form
      setNewTask("")
      setNewTaskPriority("medium")
      setNewTaskFrequency("daily")
      setIsNewTaskDialogOpen(false)

      toast({
        title: "Success",
        description: "Maintenance task created successfully.",
      })
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const renderTaskList = (tasks: any[], stats: any) => (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No {activeTab} maintenance tasks found for the selected machine.
        </div>
      ) : (
        <>
          {tasks.some(task => task.taskTemplateId) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Some tasks are linked to templates. Updates to templates will automatically sync to these tasks.
              </p>
            </div>
          )}
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center space-x-2 p-2 border rounded">
              <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                disabled={isUpdating}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                    {task.task}
                  </span>
                  {task.taskTemplateId && (
                    <Badge variant="outline" className="text-xs">
                      Template
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Badge
                    variant={
                      task.priority === "high"
                        ? "destructive"
                        : task.priority === "medium"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {task.priority}
                  </Badge>
                  <span>•</span>
                  <span>{task.frequency}</span>
                  {task.completedBy && (
                    <>
                      <span>•</span>
                      <span>Completed by {task.completedBy}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )

  const renderCompletionCard = (stats: any, title: string, icon: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.completionPercentage}%</div>
            <p className="text-sm text-muted-foreground">Complete</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completed</span>
              <span>{stats.completedTasks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining</span>
              <span>{stats.totalTasks - stats.completedTasks}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Total</span>
              <span>{stats.totalTasks}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

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
          <h2 className="text-3xl font-bold tracking-tight">Maintenance Checklist</h2>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="outline"
              onClick={async () => {
                // Get unique machine types from machines
                const machineTypes = [...new Set(machines.map(m => m.machineType))]
                
                if (machineTypes.length === 0) {
                  toast({
                    title: "No Machines",
                    description: "No machines found to synchronize.",
                    variant: "destructive",
                  })
                  return
                }

                const confirmMessage = `This will synchronize ALL machines with their templates.\n\nMachine types to sync:\n${machineTypes.join('\n')}\n\nThis will:\n• Remove tasks that no longer exist in templates\n• Add new tasks from templates\n• Update existing tasks to match templates\n\nAre you sure you want to continue?`
                
                if (!confirm(confirmMessage)) {
                  return
                }

                try {
                  setIsLoading(true)
                  let totalMachines = 0
                  let totalTasksRemoved = 0
                  let totalTasksAdded = 0
                  let totalTasksUpdated = 0

                  for (const machineType of machineTypes) {
                    const result = await apiService.synchronizeMachineType(token!, machineType)
                    totalMachines += result.machinesSynchronized
                    totalTasksRemoved += result.tasksRemoved
                    totalTasksAdded += result.tasksAdded
                    totalTasksUpdated += result.tasksUpdated
                  }

                  // Refresh maintenance tasks after sync
                  const updatedTasks = await apiService.getMaintenanceTasks(token!)
                  setMaintenanceTasks(updatedTasks)

                  toast({
                    title: "Synchronization Complete",
                    description: `Synchronized ${totalMachines} machines. Removed: ${totalTasksRemoved}, Added: ${totalTasksAdded}, Updated: ${totalTasksUpdated} tasks.`,
                  })
                } catch (error) {
                  console.error('Error synchronizing templates:', error)
                  toast({
                    title: "Error",
                    description: "Failed to synchronize templates. Please try again.",
                    variant: "destructive",
                  })
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
            >
              <Settings className="mr-2 h-4 w-4" />
              Sync Templates
            </Button>
          )}
          {user?.role === 'admin' && (
            <>
              <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Maintenance Task</DialogTitle>
                    <DialogDescription>
                      Add a new maintenance task for the selected machine.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="task">Task Description</Label>
                      <Textarea
                        id="task"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Enter task description..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select value={newTaskFrequency} onValueChange={setNewTaskFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateTask} 
                      disabled={isCreating || !newTask.trim()}
                      className="w-full"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Task"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => window.open('/task-templates', '_blank')}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Templates
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="site-select">Select Site</Label>
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
        <div className="flex-1 space-y-2">
          <Label htmlFor="machine-select">Select Machine</Label>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger>
              <SelectValue placeholder="Select a machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machines</SelectItem>
              {filteredMachines.map((machine) => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.name} - {sites.find(s => s.id === machine.siteId)?.name || 'Unknown Site'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="completed-by">Completed By</Label>
          <Input
            id="completed-by"
            value={completedBy}
            onChange={(e) => setCompletedBy(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Daily</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Weekly</span>
          </TabsTrigger>
          <TabsTrigger value="yearly" className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4" />
            <span>Yearly</span>
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Maintenance Tasks</CardTitle>
              <CardDescription>
                Complete {activeTab} maintenance tasks for selected machine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsContent value="daily" className="space-y-4">
                {renderTaskList(dailyTasks, dailyStats)}
              </TabsContent>
              <TabsContent value="weekly" className="space-y-4">
                {renderTaskList(weeklyTasks, weeklyStats)}
              </TabsContent>
              <TabsContent value="yearly" className="space-y-4">
                {renderTaskList(yearlyTasks, yearlyStats)}
              </TabsContent>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <TabsContent value="daily">
              {renderCompletionCard(dailyStats, "Daily Completion", <Clock className="h-4 w-4" />)}
            </TabsContent>
            <TabsContent value="weekly">
              {renderCompletionCard(weeklyStats, "Weekly Completion", <Calendar className="h-4 w-4" />)}
            </TabsContent>
            <TabsContent value="yearly">
              {renderCompletionCard(yearlyStats, "Yearly Completion", <CalendarDays className="h-4 w-4" />)}
            </TabsContent>

            <Card>
              <CardHeader>
                <CardTitle>Priority Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(() => {
                    const currentTasks = activeTab === "daily" ? dailyTasks : activeTab === "weekly" ? weeklyTasks : yearlyTasks
                    const highPriorityTasks = currentTasks.filter((task) => task.priority === "high" && !task.completed)
                    
                    return highPriorityTasks.length > 0 ? (
                      highPriorityTasks.map((task) => (
                        <div key={task.id} className="flex items-center space-x-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span>{task.task}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No high priority tasks pending</p>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

export default function MaintenancePage() {
  return (
    <ProtectedRoute>
      <MaintenanceContent />
    </ProtectedRoute>
  )
}
