import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Building2, 
  Mail, 
  Users, 
  Trash2, 
  FileCheck2, 
  TrendingUp, 
  BarChart3,
  Shield,
  Target,
  Clock
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface EmailDomain {
  id: string;
  client_id: string;
  domain: string;
  client?: { name: string };
}

interface ClientForm {
  name: string;
  slug: string;
}

interface DomainForm {
  clientId: string;
  domain: string;
}

interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalEvaluations: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  clientStats: Array<{
    client_name: string;
    user_count: number;
    evaluation_count: number;
  }>;
  topCriteria: Array<{
    criteria_name: string;
    usage_count: number;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    client_name: string;
    status: string;
    created_at: string;
  }>;
}

export default function SuperAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [emailDomains, setEmailDomains] = useState<EmailDomain[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalClients: 0,
    totalEvaluations: 0,
    completedEvaluations: 0,
    pendingEvaluations: 0,
    clientStats: [],
    topCriteria: [],
    recentActivity: []
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);
  const { toast } = useToast();

  const clientForm = useForm<ClientForm>();
  const domainForm = useForm<DomainForm>();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    await Promise.all([
      fetchClients(),
      fetchEmailDomains(),
      fetchDashboardStats()
    ]);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
  };

  const fetchEmailDomains = async () => {
    const { data, error } = await supabase
      .from('client_email_domains')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch email domains",
        variant: "destructive",
      });
    } else {
      setEmailDomains(data || []);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total clients
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Get total evaluations
      const { count: totalEvaluations } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true });

      // Get completed evaluations
      const { count: completedEvaluations } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Get pending evaluations
      const { count: pendingEvaluations } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      // Get client stats (users and evaluations per client)
      const { data: clientStatsData } = await supabase
        .from('clients')
        .select(`
          name,
          profiles!inner(count),
          evaluations(count)
        `);

      const clientStats = clientStatsData?.map(client => ({
        client_name: client.name,
        user_count: client.profiles?.length || 0,
        evaluation_count: client.evaluations?.length || 0
      })) || [];

      // Get top criteria by usage
      const { data: criteriaData } = await supabase
        .from('evaluation_criteria')
        .select(`
          name,
          evaluation_responses(count)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const topCriteria = criteriaData?.map(criteria => ({
        criteria_name: criteria.name,
        usage_count: criteria.evaluation_responses?.length || 0
      })).sort((a, b) => b.usage_count - a.usage_count) || [];

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('evaluations')
        .select(`
          id,
          title,
          status,
          created_at,
          clients(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const formattedActivity = recentActivity?.map(evaluation => ({
        id: evaluation.id,
        title: evaluation.title,
        client_name: evaluation.clients?.name || 'Unknown',
        status: evaluation.status,
        created_at: evaluation.created_at
      })) || [];

      setDashboardStats({
        totalUsers: totalUsers || 0,
        totalClients: totalClients || 0,
        totalEvaluations: totalEvaluations || 0,
        completedEvaluations: completedEvaluations || 0,
        pendingEvaluations: pendingEvaluations || 0,
        clientStats,
        topCriteria,
        recentActivity: formattedActivity
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard statistics",
        variant: "destructive",
      });
    }
  };

  const handleCreateClient = async (data: ClientForm) => {
    const { error } = await supabase
      .from('clients')
      .insert({
        name: data.name,
        slug: data.slug.toLowerCase().replace(/\s+/g, '-')
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      setIsDialogOpen(false);
      clientForm.reset();
      fetchDashboardData();
    }
  };

  const handleCreateDomain = async (data: DomainForm) => {
    const { error } = await supabase
      .from('client_email_domains')
      .insert({
        client_id: data.clientId,
        domain: data.domain.toLowerCase()
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Email domain added successfully",
      });
      setIsDomainDialogOpen(false);
      domainForm.reset();
      fetchDashboardData();
    }
  };

  const handleDeleteClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      fetchDashboardData();
    }
  };

  const handleDeleteDomain = async (id: string) => {
    const { error } = await supabase
      .from('client_email_domains')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Email domain deleted successfully",
      });
      fetchDashboardData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor and manage the entire 360° evaluation platform</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="domains">Email Domains</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Across all clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  Active organizations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
                <FileCheck2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalEvaluations}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats.completedEvaluations} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.pendingEvaluations}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Users per Client
                </CardTitle>
                <CardDescription>
                  User distribution across client organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardStats.clientStats.map((client, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{client.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.evaluation_count} evaluations
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        {client.user_count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Evaluation Criteria
                </CardTitle>
                <CardDescription>
                  Most frequently used evaluation criteria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardStats.topCriteria.map((criteria, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{criteria.criteria_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Used in evaluations
                        </p>
                      </div>
                      <Badge variant="outline" className="font-bold">
                        {criteria.usage_count}x
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest evaluations across all clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evaluation</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardStats.recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.title}</TableCell>
                      <TableCell>{activity.client_name}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(activity.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Client Management
                  </CardTitle>
                  <CardDescription>
                    Manage client organizations and their settings
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Client</DialogTitle>
                      <DialogDescription>
                        Add a new client organization to the platform
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={clientForm.handleSubmit(handleCreateClient)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Client Name</Label>
                        <Input
                          id="name"
                          placeholder="Acme Corporation"
                          {...clientForm.register('name', { required: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Client Slug</Label>
                        <Input
                          id="slug"
                          placeholder="acme-corp"
                          {...clientForm.register('slug', { required: true })}
                        />
                      </div>
                      <Button type="submit" className="w-full">Create Client</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Evaluations</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const clientStats = dashboardStats.clientStats.find(
                      stat => stat.client_name === client.name
                    );
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{client.slug}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{clientStats?.user_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{clientStats?.evaluation_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(client.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Domain Management
                  </CardTitle>
                  <CardDescription>
                    Configure allowed email domains for client registration
                  </CardDescription>
                </div>
                <Dialog open={isDomainDialogOpen} onOpenChange={setIsDomainDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Domain
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Email Domain</DialogTitle>
                      <DialogDescription>
                        Allow users with this email domain to register for a client
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={domainForm.handleSubmit(handleCreateDomain)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientId">Client</Label>
                        <select
                          id="clientId"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...domainForm.register('clientId', { required: true })}
                        >
                          <option value="">Select a client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="domain">Domain</Label>
                        <Input
                          id="domain"
                          placeholder="company.com"
                          {...domainForm.register('domain', { required: true })}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Domain</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailDomains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        <Badge>{domain.domain}</Badge>
                      </TableCell>
                      <TableCell>{domain.client?.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDomain(domain.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Status Distribution</CardTitle>
                <CardDescription>Overview of evaluation statuses across all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Completed</span>
                    <Badge className="bg-green-100 text-green-800">
                      {dashboardStats.completedEvaluations}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="font-medium">Pending</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {dashboardStats.pendingEvaluations}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Total</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {dashboardStats.totalEvaluations}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Summary</CardTitle>
                <CardDescription>Key platform metrics at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Active Clients</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {dashboardStats.totalClients}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <span className="font-medium">Total Users</span>
                    <Badge className="bg-indigo-100 text-indigo-800">
                      {dashboardStats.totalUsers}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                    <span className="font-medium">Avg Users/Client</span>
                    <Badge className="bg-teal-100 text-teal-800">
                      {dashboardStats.totalClients > 0 
                        ? Math.round(dashboardStats.totalUsers / dashboardStats.totalClients)
                        : 0
                      }
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}