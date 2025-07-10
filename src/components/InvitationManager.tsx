import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, Trash2 } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  invitation_type: string;
  area_id: string | null;
  token: string;
  expires_at: string;
  used_at: string | null;
  client_id: string;
  invited_by: string;
  areas?: { name: string } | null;
}

interface Area {
  id: string;
  name: string;
}

export function InvitationManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [email, setEmail] = useState("");
  const [invitationType, setInvitationType] = useState<"area_admin" | "employee">("area_admin");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvitations();
    if (profile?.role === "area_admin" || invitationType === "employee") {
      fetchAreas();
    }
  }, [profile?.role, invitationType]);

  const fetchInvitations = async () => {
    try {
      let query = supabase
        .from("invitations")
        .select(`
          *,
          areas:area_id(name)
        `)
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setInvitations(data as unknown as Invitation[] || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invitations",
        variant: "destructive",
      });
    }
  };

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error("Error fetching areas:", error);
    }
  };

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // Parse multiple emails (comma separated)
      const emails = email.split(',').map(e => e.trim()).filter(e => e);
      
      if (emails.length === 0) {
        throw new Error('Please enter at least one email address');
      }

      const results = [];
      
      // Get current user's client_id once
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", profile?.id)
        .single();

      if (profileError) throw profileError;
      
      for (const emailAddress of emails) {
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
          throw new Error(`Invalid email format: ${emailAddress}`);
        }

        // Generate token for each email
        const { data: tokenData, error: tokenError } = await supabase
          .rpc("generate_invitation_token");

        if (tokenError) throw tokenError;

        // Create invitation
        const invitationData = {
          email: emailAddress,
          invitation_type: invitationType,
          token: tokenData,
          area_id: invitationType === "employee" ? selectedAreaId : null,
          client_id: userProfile.client_id,
          invited_by: profile?.id,
        };

        const { error } = await supabase
          .from("invitations")
          .insert(invitationData);

        if (error) throw error;
        results.push(emailAddress);
      }

      toast({
        title: "Success",
        description: `${results.length} invitation${results.length > 1 ? 's' : ''} created successfully`,
      });

      setEmail("");
      setSelectedAreaId("");
      fetchInvitations();
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Invitation link copied to clipboard",
    });
  };

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation deleted",
      });

      fetchInvitations();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    }
  };

  const canCreateAreaAdmin = profile?.role === "client_admin";
  const canCreateEmployee = profile?.role === "area_admin" || profile?.role === "client_admin";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Invitation</CardTitle>
          <CardDescription>
            Send invitation links to new users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createInvitation} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email addresses (comma separated for multiple)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Send invitation links to new users. Use commas to separate multiple email addresses.
              </p>
            </div>

            <div>
              <Select
                value={invitationType}
                onValueChange={(value: "area_admin" | "employee") => setInvitationType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canCreateAreaAdmin && (
                    <SelectItem value="area_admin">Area Admin</SelectItem>
                  )}
                  {canCreateEmployee && (
                    <SelectItem value="employee">Employee</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {invitationType === "employee" && (
              <div>
                <Select
                  value={selectedAreaId}
                  onValueChange={setSelectedAreaId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <p className="text-muted-foreground">No invitations found</p>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">{invitation.email}</span>
                      <Badge variant="outline">
                        {invitation.invitation_type.replace("_", " ")}
                      </Badge>
                      {invitation.areas && (
                        <Badge variant="secondary">{invitation.areas.name}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                      {invitation.used_at && (
                        <span className="ml-2 text-green-600">
                          • Used on {new Date(invitation.used_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!invitation.used_at && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInvitationLink(invitation.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInvitation(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}