"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertTriangle, Loader2, Plus, Edit, Trash2, Settings, RefreshCw, ChevronDown } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

function TaskTemplatesContent() {
  const { token, user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Task templates data
  const [taskTemplates, setTaskTemplates] = useState<any[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([])
  const [machineTypes, setMachineTypes] = useState<string[]>([])

  // Form state
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false)
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [newTemplate, setNewTemplate] = useState({
    task: '',
    priority: 'medium',
    frequency: 'daily',
    machineType: '',
    description: ''
  })
  const [editTemplate, setEditTemplate] = useState({
    task: '',
    priority: 'medium',
    frequency: 'daily',
    machineType: '',
    description: ''
  })

  // Filters
  const [machineTypeFilter, setMachineTypeFilter] = useState('all')
  const [frequencyFilter, setFrequencyFilter] = useState('all')

  // Combobox state
  const [newMachineTypeOpen, setNewMachineTypeOpen] = useState(false)
  const [editMachineTypeOpen, setEditMachineTypeOpen] = useState(false)

  // Custom Combobox Component
  const MachineTypeCombobox = ({ 
    value, 
    onValueChange, 
    placeholder = "Select or type machine type...",
    open,
    onOpenChange
  }: {
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => {
    const [inputValue, setInputValue] = useState(value)

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        onValueChange(inputValue.trim())
        setInputValue(inputValue.trim())
        onOpenChange(false)
      }
    }

    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value || placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder="Search machine types..." 
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-sm text-muted-foreground">
                  Press Enter to create "{inputValue}"
                </div>
              </CommandEmpty>
              <CommandGroup>
                {machineTypes.map((type) => (
                  <CommandItem
                    key={type}
                    value={type}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue)
                      setInputValue(currentValue)
                      onOpenChange(false)
                    }}
                  >
                    {type}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  // Fetch task templates and machine types on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        setIsLoading(true)
        const [templatesData, machineTypesData] = await Promise.all([
          apiService.getMaintenanceTaskTemplates(token),
          apiService.getMachineTypes(token)
        ])
        setTaskTemplates(templatesData)
        setFilteredTemplates(templatesData)
        setMachineTypes(machineTypesData)
        console.log('Loaded machine types:', machineTypesData)
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

  // Filter templates based on selected filters
  useEffect(() => {
    let filtered = taskTemplates

    if (machineTypeFilter !== 'all') {
      filtered = filtered.filter(template => template.machineType === machineTypeFilter)
    }

    if (frequencyFilter !== 'all') {
      filtered = filtered.filter(template => template.frequency === frequencyFilter)
    }

    setFilteredTemplates(filtered)
  }, [taskTemplates, machineTypeFilter, frequencyFilter])

  const handleCreateTemplate = async () => {
    if (!newTemplate.task.trim() || !newTemplate.machineType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    
    try {
      await apiService.createMaintenanceTaskTemplate(token!, {
        task: newTemplate.task.trim(),
        priority: newTemplate.priority,
        frequency: newTemplate.frequency,
        machineType: newTemplate.machineType,
        description: newTemplate.description.trim() || undefined
      })

      // Refresh templates
      const updatedTemplates = await apiService.getMaintenanceTaskTemplates(token!)
      setTaskTemplates(updatedTemplates)

      // Also refresh machine types in case a new type was added
      const updatedMachineTypes = await apiService.getMachineTypes(token!)
      setMachineTypes(updatedMachineTypes)

      // Automatically synchronize machines of this machine type
      try {
        const syncResult = await apiService.synchronizeMachineType(token!, newTemplate.machineType)
        console.log(`Auto-sync result for ${newTemplate.machineType}:`, syncResult)
      } catch (syncError) {
        console.error('Auto-sync error:', syncError)
        // Don't show error to user as the template was created successfully
      }

      // Reset form
      setNewTemplate({
        task: '',
        priority: 'medium',
        frequency: 'daily',
        machineType: '',
        description: ''
      })
      setIsNewTemplateDialogOpen(false)

      toast({
        title: "Success",
        description: "Task template created successfully.",
      })
    } catch (error) {
      console.error('Error creating template:', error)
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !editTemplate.task.trim() || !editTemplate.machineType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Check if machine type is changing
    const machineTypeChanged = editingTemplate.machineType !== editTemplate.machineType
    const taskChanged = editingTemplate.task !== editTemplate.task
    const priorityChanged = editingTemplate.priority !== editTemplate.priority
    const frequencyChanged = editingTemplate.frequency !== editTemplate.frequency

    if (machineTypeChanged || taskChanged || priorityChanged || frequencyChanged) {
      const changes = []
      if (machineTypeChanged) changes.push(`Machine type: ${editingTemplate.machineType} → ${editTemplate.machineType}`)
      if (taskChanged) changes.push(`Task description`)
      if (priorityChanged) changes.push(`Priority: ${editingTemplate.priority} → ${editTemplate.priority}`)
      if (frequencyChanged) changes.push(`Frequency: ${editingTemplate.frequency} → ${editTemplate.frequency}`)

      let confirmMessage = `This will synchronize ALL machines with their templates.\n\nChanges:\n${changes.join('\n')}\n\nThis will:\n• Remove tasks that no longer exist in templates\n• Add new tasks from templates\n• Update existing tasks to match templates`
      
      if (machineTypeChanged) {
        confirmMessage += `\n\n⚠️ Machine type change will:\n• Remove this task from machines of type "${editingTemplate.machineType}"\n• Add this task to machines of type "${editTemplate.machineType}"`
      }
      
      confirmMessage += `\n\nAre you sure you want to continue?`
      
      if (!confirm(confirmMessage)) {
        return
      }
    }

    setIsUpdating(true)
    
    try {
      await apiService.updateMaintenanceTaskTemplate(token!, editingTemplate.id, {
        task: editTemplate.task.trim(),
        priority: editTemplate.priority,
        frequency: editTemplate.frequency,
        machineType: editTemplate.machineType,
        description: editTemplate.description.trim() || undefined
      })

      // Refresh templates
      const updatedTemplates = await apiService.getMaintenanceTaskTemplates(token!)
      setTaskTemplates(updatedTemplates)

      // Also refresh machine types in case a new type was added
      const updatedMachineTypes = await apiService.getMachineTypes(token!)
      setMachineTypes(updatedMachineTypes)

      // Reset form
      setEditingTemplate(null)
      setEditTemplate({
        task: '',
        priority: 'medium',
        frequency: 'daily',
        machineType: '',
        description: ''
      })
      setIsEditTemplateDialogOpen(false)

      toast({
        title: "Success",
        description: machineTypeChanged 
          ? `Task template updated successfully. Tasks have been moved from "${editingTemplate.machineType}" to "${editTemplate.machineType}" machines.`
          : `Task template updated successfully. All machines of type "${editTemplate.machineType}" have been synchronized with the updated templates.`,
      })
    } catch (error) {
      console.error('Error updating template:', error)
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string, taskName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${taskName}"?`)) {
      return
    }

    setIsDeleting(true)
    
    try {
      // Get the template to know its machine type before deleting
      const template = taskTemplates.find(t => t.id === templateId)
      const machineType = template?.machineType || ''

      const response = await apiService.deleteMaintenanceTaskTemplate(token!, templateId)

      // Refresh templates
      const updatedTemplates = await apiService.getMaintenanceTaskTemplates(token!)
      setTaskTemplates(updatedTemplates)

      // Also refresh machine types in case a new type was added
      const updatedMachineTypes = await apiService.getMachineTypes(token!)
      setMachineTypes(updatedMachineTypes)

      // Automatically synchronize machines of this machine type
      if (machineType) {
        try {
          const syncResult = await apiService.synchronizeMachineType(token!, machineType)
          console.log(`Auto-sync result after deletion:`, syncResult)
        } catch (syncError) {
          console.error('Auto-sync error after deletion:', syncError)
          // Don't show error to user as the template was deleted successfully
        }
      }

      toast({
        title: "Success",
        description: `Task template deleted successfully. ${response.tasksDeleted || 0} related maintenance tasks have also been removed.`,
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditDialog = (template: any) => {
    setEditingTemplate(template)
    setEditTemplate({
      task: template.task,
      priority: template.priority,
      frequency: template.frequency,
      machineType: template.machineType,
      description: template.description || ''
    })
    setIsEditTemplateDialogOpen(true)
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
          <h2 className="text-3xl font-bold tracking-tight">Maintenance Task Templates</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                setIsLoading(true)
                const [templatesData, machineTypesData] = await Promise.all([
                  apiService.getMaintenanceTaskTemplates(token!),
                  apiService.getMachineTypes(token!)
                ])
                setTaskTemplates(templatesData)
                setFilteredTemplates(templatesData)
                setMachineTypes(machineTypesData)
                toast({
                  title: "Success",
                  description: "Data refreshed successfully.",
                })
              } catch (error) {
                console.error('Error refreshing data:', error)
                toast({
                  title: "Error",
                  description: "Failed to refresh data. Please try again.",
                  variant: "destructive",
                })
              } finally {
                setIsLoading(false)
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              // Get unique machine types from templates
              const templateMachineTypes = [...new Set(taskTemplates.map(t => t.machineType))]
              
              if (templateMachineTypes.length === 0) {
                toast({
                  title: "No Templates",
                  description: "No templates found to synchronize.",
                  variant: "destructive",
                })
                return
              }

              const confirmMessage = `This will synchronize ALL machines with their templates.\n\nMachine types to sync:\n${templateMachineTypes.join('\n')}\n\nThis will:\n• Remove tasks that no longer exist in templates\n• Add new tasks from templates\n• Update existing tasks to match templates\n\nAre you sure you want to continue?`
              
              if (!confirm(confirmMessage)) {
                return
              }

              try {
                setIsLoading(true)
                let totalMachines = 0
                let totalTasksRemoved = 0
                let totalTasksAdded = 0
                let totalTasksUpdated = 0

                for (const machineType of templateMachineTypes) {
                  const result = await apiService.synchronizeMachineType(token!, machineType)
                  totalMachines += result.machinesSynchronized
                  totalTasksRemoved += result.tasksRemoved
                  totalTasksAdded += result.tasksAdded
                  totalTasksUpdated += result.tasksUpdated
                }

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
            Sync All Templates
          </Button>
          {user?.role === 'admin' && (
            <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task Template</DialogTitle>
                  <DialogDescription>
                    Create a standard maintenance task template for machine types.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-task">Task Description</Label>
                    <Textarea
                      id="template-task"
                      value={newTemplate.task}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, task: e.target.value }))}
                      placeholder="Enter task description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-priority">Priority</Label>
                      <Select value={newTemplate.priority} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, priority: value }))}>
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
                      <Label htmlFor="template-frequency">Frequency</Label>
                      <Select value={newTemplate.frequency} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, frequency: value }))}>
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
                  <div className="space-y-2">
                    <Label htmlFor="template-machine-type">Machine Type</Label>
                    <MachineTypeCombobox
                      value={newTemplate.machineType}
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, machineType: value }))}
                      open={newMachineTypeOpen}
                      onOpenChange={setNewMachineTypeOpen}
                    />
                    {machineTypes.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Existing types: {machineTypes.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description (Optional)</Label>
                    <Textarea
                      id="template-description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter additional description..."
                    />
                  </div>
                  <Button 
                    onClick={handleCreateTemplate} 
                    disabled={isCreating || !newTemplate.task.trim()}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Template"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="machine-type-filter">Filter by Machine Type</Label>
          <Select value={machineTypeFilter} onValueChange={setMachineTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Machine Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machine Types</SelectItem>
              {machineTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="frequency-filter">Filter by Frequency</Label>
          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Frequencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Templates</CardTitle>
          <CardDescription>Standard maintenance tasks for different machine types</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Machine Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No task templates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.task}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.machineType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{template.frequency}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          template.priority === "high"
                            ? "destructive"
                            : template.priority === "medium"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {template.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      {user?.role === 'admin' && (
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id, template.task)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Template Dialog */}
      <Dialog open={isEditTemplateDialogOpen} onOpenChange={setIsEditTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Template</DialogTitle>
            <DialogDescription>
              Update the task template information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-task">Task Description</Label>
              <Textarea
                id="edit-template-task"
                value={editTemplate.task}
                onChange={(e) => setEditTemplate(prev => ({ ...prev, task: e.target.value }))}
                placeholder="Enter task description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-template-priority">Priority</Label>
                <Select value={editTemplate.priority} onValueChange={(value) => setEditTemplate(prev => ({ ...prev, priority: value }))}>
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
                <Label htmlFor="edit-template-frequency">Frequency</Label>
                <Select value={editTemplate.frequency} onValueChange={(value) => setEditTemplate(prev => ({ ...prev, frequency: value }))}>
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
            <div className="space-y-2">
              <Label htmlFor="edit-template-machine-type">Machine Type</Label>
              <MachineTypeCombobox
                value={editTemplate.machineType}
                onValueChange={(value) => setEditTemplate(prev => ({ ...prev, machineType: value }))}
                open={editMachineTypeOpen}
                onOpenChange={setEditMachineTypeOpen}
              />
              {machineTypes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Existing types: {machineTypes.join(', ')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-description">Description (Optional)</Label>
              <Textarea
                id="edit-template-description"
                value={editTemplate.description}
                onChange={(e) => setEditTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter additional description..."
              />
            </div>
            <Button 
              onClick={handleUpdateTemplate} 
              disabled={isUpdating || !editTemplate.task.trim()}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Template"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TaskTemplatesPage() {
  return (
    <ProtectedRoute>
      <TaskTemplatesContent />
    </ProtectedRoute>
  )
} 