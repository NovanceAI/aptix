import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, Crown, Users, UserPlus } from 'lucide-react';
import { AreaRegistration } from '@/components/AreaRegistration';

interface SignInForm {
  email: string;
  password: string;
}

interface InviteSignUpForm {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  areaId?: string;
}

interface Invitation {
  id: string;
  email: string;
  invitation_type: string;
  client_id: string;
  area_id: string | null;
  invited_by: string;
}

interface Area {
  id: string;
  name: string;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [showAreaRegistration, setShowAreaRegistration] = useState(false);
  
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const signInForm = useForm<SignInForm>();
  const inviteSignUpForm = useForm<InviteSignUpForm>();

  useEffect(() => {
    if (inviteToken) {
      validateInvitation();
    }
  }, [inviteToken]);

  const validateInvitation = async () => {
    if (!inviteToken) return;

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', inviteToken)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Invalid or expired invitation link');
        return;
      }

      setInvitation(data);
      
      // If it's an area admin invitation, fetch available areas
      if (data.invitation_type === 'area_admin') {
        const { data: areasData } = await supabase
          .from('areas')
          .select('id, name')
          .eq('client_id', data.client_id)
          .order('name');
        
        setAreas(areasData || []);
      }
    } catch (err) {
      console.error('Error validating invitation:', err);
      setError('Failed to validate invitation');
    }
  };

  const handleSignIn = async (data: SignInForm) => {
    setIsLoading(true);
    setError(null);

    const { error } = await signIn(data.email, data.password);

    if (error) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  const handleInviteSignUp = async (data: InviteSignUpForm) => {
    if (!invitation) return;
    
    if (data.password !== data.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // For area admin invitations, require area selection or creation
    if (invitation.invitation_type === 'area_admin' && !data.areaId && !showAreaRegistration) {
      setError("Please select an area or create a new one");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check domain restriction
      const domain = invitation.email.split('@')[1];
      const { data: clientDomain } = await supabase
        .from('client_email_domains')
        .select('client_id')
        .eq('domain', domain)
        .eq('client_id', invitation.client_id)
        .single();

      if (!clientDomain) {
        setError('Email domain not authorized for this organization');
        return;
      }

      // Sign up the user
      const { error: signUpError } = await signUp(
        invitation.email,
        data.password,
        data.firstName,
        data.lastName
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Wait a moment for auth to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the user session to get the user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Failed to get user information after signup");
        return;
      }

      // Create profile for the user
      const profileData: any = {
        id: user.id,
        email: invitation.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: invitation.invitation_type === 'area_admin' ? 'area_admin' : 'user',
        client_id: invitation.client_id,
      };

      if (invitation.invitation_type === 'employee' && invitation.area_id) {
        profileData.area_id = invitation.area_id;
      } else if (invitation.invitation_type === 'area_admin' && data.areaId) {
        profileData.area_id = data.areaId;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        setError("Failed to create user profile: " + profileError.message);
        return;
      }

      // If area admin, grant area admin permission
      if (invitation.invitation_type === 'area_admin' && data.areaId) {
        const { error: permissionError } = await supabase
          .from('area_permissions')
          .insert({
            user_id: user.id,
            area_id: data.areaId,
            permission_level: 'admin',
            granted_by: invitation.invited_by,
          });

        if (permissionError) {
          console.error("Permission creation error:", permissionError);
          // Don't fail the signup for this, just log it
        }
      }

      // Mark invitation as used
      await supabase
        .from('invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      toast({
        title: "Success",
        description: "Account created successfully! Please check your email to verify your account.",
      });

    } catch (err: any) {
      console.error('Error during signup:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAreaCreated = (areaId: string) => {
    inviteSignUpForm.setValue('areaId', areaId);
    setShowAreaRegistration(false);
    setAreas(prev => [...prev, { id: areaId, name: 'New Area' }]);
  };

  // Redirect to regular auth if no invitation
  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">360° Reviews</h1>
            </div>
            <CardTitle className="text-2xl">Access Restricted</CardTitle>
            <CardDescription>
              Account creation is by invitation only. Contact your administrator for an invitation link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      {...signInForm.register('email', { required: true })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      {...signInForm.register('password', { required: true })}
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">360° Reviews</h1>
          </div>
          <CardTitle className="text-2xl">Join Organization</CardTitle>
          <CardDescription>
            {invitation ? (
              <>Complete your registration for <strong>{invitation.email}</strong></>
            ) : (
              'Loading invitation...'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitation && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <UserPlus className="h-4 w-4 text-green-600" />
                <div className="text-sm">
                  <p className="font-medium text-green-900">
                    {invitation.invitation_type === 'area_admin' ? 'Area Admin Invitation' : 'Employee Invitation'}
                  </p>
                  <p className="text-green-700">
                    You've been invited to join as {invitation.invitation_type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {showAreaRegistration ? (
                <AreaRegistration 
                  onAreaCreated={handleAreaCreated}
                  clientId={invitation.client_id}
                />
              ) : (
                <form onSubmit={inviteSignUpForm.handleSubmit(handleInviteSignUp)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">First Name</Label>
                      <Input
                        id="signup-firstname"
                        placeholder="First name"
                        {...inviteSignUpForm.register('firstName', { required: true })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        placeholder="Last name"
                        {...inviteSignUpForm.register('lastName', { required: true })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={invitation.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  {invitation.invitation_type === 'area_admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="area-select">Select Area</Label>
                      <Select
                        value={inviteSignUpForm.watch('areaId') || ''}
                        onValueChange={(value) => inviteSignUpForm.setValue('areaId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your area" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAreaRegistration(true)}
                        className="w-full mt-2"
                      >
                        Or Create New Area
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      {...inviteSignUpForm.register('password', { required: true, minLength: 6 })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      {...inviteSignUpForm.register('confirmPassword', { required: true })}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}