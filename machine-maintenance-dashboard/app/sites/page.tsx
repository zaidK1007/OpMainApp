"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, MapPin, Settings, Trash2, ClipboardList } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

function SitesContent() {
  const { user, token, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [sites, setSites] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false)
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false)
  const [isEditSiteOpen, setIsEditSiteOpen] = useState(false)
  const [isEditMachineOpen, setIsEditMachineOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [siteForm, setSiteForm] = useState({ name: '', location: '' })
  const [machineForm, setMachineForm] = useState({
    name: '',
    siteId: '',
    desiredDailyHours: '',
    machineType: ''
  })

  // Edit form states
  const [editingSite, setEditingSite] = useState<any>(null)
  const [editingMachine, setEditingMachine] = useState<any>(null)
  const [editSiteForm, setEditSiteForm] = useState({ name: '', location: '' })
  const [editMachineForm, setEditMachineForm] = useState({
    name: '',
    siteId: '',
    desiredDailyHours: '',
    machineType: ''
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (isAddSiteOpen) {
      setSiteForm({ name: '', location: '' })
    }
  }, [isAddSiteOpen])

  useEffect(() => {
    if (isAddMachineOpen) {
      setMachineForm({ name: '', siteId: '', desiredDailyHours: '', machineType: '' })
    }
  }, [isAddMachineOpen])

  // Reset edit form when edit dialog opens
  useEffect(() => {
    if (isEditSiteOpen && editingSite) {
      setEditSiteForm({ name: editingSite.name, location: editingSite.location })
    }
  }, [isEditSiteOpen, editingSite])

  useEffect(() => {
    if (isEditMachineOpen && editingMachine) {
      setEditMachineForm({
        name: editingMachine.name,
        siteId: editingMachine.siteId,
        desiredDailyHours: editingMachine.desiredDailyHours.toString(),
        machineType: editingMachine.machineType
      })
    }
  }, [isEditMachineOpen, editingMachine])

  useEffect(() => {
    if (token) {
      loadData()
    } else if (!authLoading) {
      // If no token and not loading, redirect to login
      router.push('/login')
    }
  }, [token, authLoading])

  const loadData = async () => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    try {
      setLoading(true)
      const [sitesData, machinesData] = await Promise.all([
        apiService.getSites(token),
        apiService.getMachines(token)
      ])
      setSites(sitesData)
      setMachines(machinesData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      if (error.message?.includes('Invalid or expired token') || error.message?.includes('401')) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })
        // Clear auth data and redirect to login
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        router.push('/login')
      } else {
        toast({
          title: "Error",
          description: "Failed to load sites and machines data",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddSite = async () => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    console.log('Submitting site form with data:', siteForm)
    console.log('Form state at submission:', { name: siteForm.name, location: siteForm.location })

    if (!siteForm.name || !siteForm.location) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const siteData = { name: siteForm.name, location: siteForm.location }
      console.log('Sending site data to API:', siteData)
      
      await apiService.createSite(token, siteData)
      toast({
        title: "Success",
        description: "Site created successfully",
      })
      setSiteForm({ name: '', location: '' })
      setIsAddSiteOpen(false)
      loadData()
    } catch (error: any) {
      console.error('Error creating site:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create site",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddMachine = async () => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    if (!machineForm.name || !machineForm.siteId || !machineForm.desiredDailyHours) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      console.log('Creating machine with data:', {
        ...machineForm,
        desiredDailyHours: parseInt(machineForm.desiredDailyHours)
      })
      await apiService.createMachine(token, {
        ...machineForm,
        desiredDailyHours: parseInt(machineForm.desiredDailyHours)
      })
      toast({
        title: "Success",
        description: "Machine created successfully",
      })
      setMachineForm({ name: '', siteId: '', desiredDailyHours: '', machineType: '' })
      setIsAddMachineOpen(false)
      loadData()
    } catch (error: any) {
      console.error('Error creating machine:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create machine",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    if (!confirm(`Are you sure you want to delete the site "${siteName}"?`)) {
      return
    }

    try {
      await apiService.deleteSite(token, siteId)
      toast({
        title: "Success",
        description: "Site deleted successfully",
      })
      loadData()
    } catch (error: any) {
      console.error('Error deleting site:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete site",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMachine = async (machineId: string, machineName: string) => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    if (!confirm(`Are you sure you want to delete the machine "${machineName}"?`)) {
      return
    }

    try {
      await apiService.deleteMachine(token, machineId)
      toast({
        title: "Success",
        description: "Machine deleted successfully",
      })
      loadData()
    } catch (error: any) {
      console.error('Error deleting machine:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete machine",
        variant: "destructive",
      })
    }
  }

  const handleTestRequest = async () => {
    try {
      const testData = { name: 'Test Site', location: 'Test Location' }
      console.log('Testing request with data:', testData)
      const result = await apiService.testEndpoint(testData)
      console.log('Test result:', result)
      toast({
        title: "Test Success",
        description: "Request test completed successfully",
      })
    } catch (error: any) {
      console.error('Test error:', error)
      toast({
        title: "Test Error",
        description: error.message || "Test failed",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSite = async () => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    if (!editingSite) {
      toast({
        title: "Error",
        description: "No site selected for editing",
        variant: "destructive",
      })
      return
    }

    if (!editSiteForm.name || !editSiteForm.location) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      await apiService.updateSite(token, editingSite.id, editSiteForm)
      toast({
        title: "Success",
        description: "Site updated successfully",
      })
      setEditingSite(null)
      setEditSiteForm({ name: '', location: '' })
      setIsEditSiteOpen(false)
      loadData()
    } catch (error: any) {
      console.error('Error updating site:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update site",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateMachine = async () => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    if (!editingMachine) {
      toast({
        title: "Error",
        description: "No machine selected for editing",
        variant: "destructive",
      })
      return
    }

    if (!editMachineForm.name || !editMachineForm.siteId || !editMachineForm.desiredDailyHours) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      await apiService.updateMachine(token, editingMachine.id, {
        ...editMachineForm,
        desiredDailyHours: parseInt(editMachineForm.desiredDailyHours)
      })
      toast({
        title: "Success",
        description: "Machine updated successfully",
      })
      setEditingMachine(null)
      setEditMachineForm({ name: '', siteId: '', desiredDailyHours: '', machineType: '' })
      setIsEditMachineOpen(false)
      loadData()
    } catch (error: any) {
      console.error('Error updating machine:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update machine",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApplyTaskTemplates = async (machineId: string, machineName: string) => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access this page",
        variant: "destructive",
      })
      router.push('/login')
      return
    }

    if (!confirm(`Apply standard maintenance tasks to "${machineName}"?`)) {
      return
    }

    try {
      setSubmitting(true)
      await apiService.applyTaskTemplatesToMachine(token, machineId)
      toast({
        title: "Success",
        description: "Maintenance tasks applied successfully",
      })
      loadData()
    } catch (error: any) {
      console.error('Error applying task templates:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to apply task templates",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Sites & Machines</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Sites & Machines</h2>
        </div>
      </div>

      <Tabs defaultValue="sites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">All Sites</h3>
            <Dialog 
              open={isAddSiteOpen} 
              onOpenChange={(open) => {
                if (!open && !submitting) {
                  setIsAddSiteOpen(false)
                  setSiteForm({ name: '', location: '' })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setIsAddSiteOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Site
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Site</DialogTitle>
                  <DialogDescription>Create a new site location</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="site-name" className="text-right">
                      Name
                    </Label>
                    <Input 
                      id="site-name" 
                      className="col-span-3"
                      value={siteForm.name}
                      onChange={(e) => setSiteForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter site name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="site-location" className="text-right">
                      Location
                    </Label>
                    <Input 
                      id="site-location" 
                      className="col-span-3"
                      value={siteForm.location}
                      onChange={(e) => setSiteForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter site location"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddSiteOpen(false)
                      setSiteForm({ name: '', location: '' })
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddSite}
                    disabled={submitting}
                  >
                    {submitting ? "Adding..." : "Add Site"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <Card key={site.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {site.name}
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingSite(site)
                          setIsEditSiteOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteSite(site.id, site.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription className="flex items-center">
                    <MapPin className="mr-1 h-4 w-4" />
                    {site.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Machines</span>
                    <Badge variant="secondary">{site.machineCount}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">All Machines</h3>
            <Dialog 
              open={isAddMachineOpen} 
              onOpenChange={(open) => {
                if (!open && !submitting) {
                  setIsAddMachineOpen(false)
                  setMachineForm({ name: '', siteId: '', desiredDailyHours: '', machineType: '' })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setIsAddMachineOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Machine
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Machine</DialogTitle>
                  <DialogDescription>Add a new machine to a site</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="machine-name" className="text-right">
                      Name
                    </Label>
                    <Input 
                      id="machine-name" 
                      className="col-span-3"
                      value={machineForm.name}
                      onChange={(e) => setMachineForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter machine name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="machine-site" className="text-right">
                      Site
                    </Label>
                    <Select 
                      value={machineForm.siteId}
                      onValueChange={(value) => setMachineForm(prev => ({ ...prev, siteId: value }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="desired-hours" className="text-right">
                      Daily Hours
                    </Label>
                    <Input 
                      id="desired-hours" 
                      type="number" 
                      className="col-span-3"
                      value={machineForm.desiredDailyHours}
                      onChange={(e) => setMachineForm(prev => ({ ...prev, desiredDailyHours: e.target.value }))}
                      placeholder="Enter daily hours"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="machine-type" className="text-right">
                      Machine Type
                    </Label>
                    <Input 
                      id="machine-type" 
                      className="col-span-3"
                      value={machineForm.machineType}
                      onChange={(e) => setMachineForm(prev => ({ ...prev, machineType: e.target.value }))}
                      placeholder="e.g., DSS, Pump, Compressor, Generator"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddMachineOpen(false)
                      setMachineForm({ name: '', siteId: '', desiredDailyHours: '', machineType: '' })
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddMachine}
                    disabled={submitting}
                  >
                    {submitting ? "Adding..." : "Add Machine"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Machine List</CardTitle>
              <CardDescription>Manage all machines across sites</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine Name</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Maintenance</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((machine) => (
                    <TableRow key={machine.id}>
                      <TableCell className="font-medium">{machine.name}</TableCell>
                      <TableCell>{machine.site.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            machine.status === "operational"
                              ? "default"
                              : machine.status === "under-maintenance"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {machine.status.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(machine.nextMaintenanceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{machine.totalHoursRun}h</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleApplyTaskTemplates(machine.id, machine.name)}
                            title="Apply maintenance task templates"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingMachine(machine)
                              setIsEditMachineOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteMachine(machine.id, machine.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Site Dialog */}
      <Dialog 
        open={isEditSiteOpen} 
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setIsEditSiteOpen(false)
            setEditingSite(null)
            setEditSiteForm({ name: '', location: '' })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
            <DialogDescription>Update site information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-name" className="text-right">
                Name
              </Label>
              <Input 
                id="edit-site-name" 
                className="col-span-3"
                value={editSiteForm.name}
                onChange={(e) => setEditSiteForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter site name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-location" className="text-right">
                Location
              </Label>
              <Input 
                id="edit-site-location" 
                className="col-span-3"
                value={editSiteForm.location}
                onChange={(e) => setEditSiteForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter site location"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditSiteOpen(false)
                setEditingSite(null)
                setEditSiteForm({ name: '', location: '' })
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSite}
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Update Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Machine Dialog */}
      <Dialog 
        open={isEditMachineOpen} 
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setIsEditMachineOpen(false)
            setEditingMachine(null)
            setEditMachineForm({ name: '', siteId: '', desiredDailyHours: '', machineType: '' })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
            <DialogDescription>Update machine information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-machine-name" className="text-right">
                Name
              </Label>
              <Input 
                id="edit-machine-name" 
                className="col-span-3"
                value={editMachineForm.name}
                onChange={(e) => setEditMachineForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter machine name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-machine-site" className="text-right">
                Site
              </Label>
              <Select 
                value={editMachineForm.siteId}
                onValueChange={(value) => setEditMachineForm(prev => ({ ...prev, siteId: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-desired-hours" className="text-right">
                Daily Hours
              </Label>
              <Input 
                id="edit-desired-hours" 
                type="number" 
                className="col-span-3"
                value={editMachineForm.desiredDailyHours}
                onChange={(e) => setEditMachineForm(prev => ({ ...prev, desiredDailyHours: e.target.value }))}
                placeholder="Enter daily hours"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-machine-type" className="text-right">
                Machine Type
              </Label>
              <Input 
                id="edit-machine-type" 
                className="col-span-3"
                value={editMachineForm.machineType}
                onChange={(e) => setEditMachineForm(prev => ({ ...prev, machineType: e.target.value }))}
                placeholder="e.g., DSS, Pump, Compressor, Generator"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditMachineOpen(false)
                setEditingMachine(null)
                setEditMachineForm({ name: '', siteId: '', desiredDailyHours: '', machineType: '' })
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateMachine}
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Update Machine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SitesPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <SitesContent />
    </ProtectedRoute>
  )
}
