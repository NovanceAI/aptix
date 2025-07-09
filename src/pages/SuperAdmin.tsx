import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Mail, Users, Trash2 } from 'lucide-react';

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

export default function SuperAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [emailDomains, setEmailDomains] = useState<EmailDomain[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);
  const { toast } = useToast();

  const clientForm = useForm<ClientForm>();
  const domainForm = useForm<DomainForm>();

  useEffect(() => {
    fetchClients();
    fetchEmailDomains();
  }, []);

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
      fetchClients();
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
      fetchEmailDomains();
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
      fetchClients();
      fetchEmailDomains();
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
      fetchEmailDomains();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage clients and email domains</p>
        </div>
      </div>

      {/* Clients Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Clients
              </CardTitle>
              <CardDescription>
                Manage client organizations
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
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{client.slug}</Badge>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Domains Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Domains
              </CardTitle>
              <CardDescription>
                Manage allowed email domains for each client
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
    </div>
  );
}