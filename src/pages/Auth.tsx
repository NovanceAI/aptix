import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, Crown, Users } from 'lucide-react';

interface SignInForm {
  email: string;
  password: string;
}

interface SignUpForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName?: string;
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailDomainInfo, setEmailDomainInfo] = useState<{
    exists: boolean;
    clientName?: string;
    willBeAdmin: boolean;
  }>({ exists: false, willBeAdmin: false });
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const signInForm = useForm<SignInForm>();
  const signUpForm = useForm<SignUpForm>();

  // Watch email input to check domain status
  const watchedEmail = signUpForm.watch('email');

  useEffect(() => {
    const checkEmailDomain = async () => {
      if (!watchedEmail || !watchedEmail.includes('@')) {
        setEmailDomainInfo({ exists: false, willBeAdmin: false });
        return;
      }

      const domain = watchedEmail.split('@')[1];
      if (!domain) return;

      try {
        const { data, error } = await supabase
          .from('client_email_domains')
          .select('clients(name)')
          .eq('domain', domain)
          .maybeSingle();

        if (error) {
          console.error('Error checking domain:', error);
          return;
        }

        if (data) {
          setEmailDomainInfo({
            exists: true,
            clientName: data.clients?.name,
            willBeAdmin: false
          });
        } else {
          setEmailDomainInfo({
            exists: false,
            willBeAdmin: true
          });
        }
      } catch (err) {
        console.error('Error checking domain:', err);
      }
    };

    const timeoutId = setTimeout(checkEmailDomain, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedEmail]);

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

  const handleSignUp = async (data: SignUpForm) => {
    if (data.password !== data.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error } = await signUp(
      data.email, 
      data.password, 
      data.firstName, 
      data.lastName,
      data.companyName
    );

    if (error) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const successMessage = emailDomainInfo.willBeAdmin 
        ? "Company created and account registered! You'll be the admin for your organization. Please check your email to verify your account."
        : "Account created successfully! Please check your email to verify your account.";
      
      toast({
        title: "Success",
        description: successMessage,
      });
    }

    setIsLoading(false);
  };

  const getDomainStatusMessage = () => {
    if (!watchedEmail || !watchedEmail.includes('@')) return null;

    if (emailDomainInfo.exists) {
      return (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Users className="h-4 w-4 text-blue-600" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">
              Joining {emailDomainInfo.clientName}
            </p>
            <p className="text-blue-700">
              You'll be added as a team member to this organization
            </p>
          </div>
        </div>
      );
    } else if (emailDomainInfo.willBeAdmin) {
      return (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <Crown className="h-4 w-4 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">
              Creating New Organization
            </p>
            <p className="text-amber-700">
              You'll be the admin for this company domain
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">360° Reviews</h1>
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name</Label>
                    <Input
                      id="signup-firstname"
                      placeholder="First name"
                      {...signUpForm.register('firstName', { required: true })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      placeholder="Last name"
                      {...signUpForm.register('lastName', { required: true })}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Work Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your work email"
                    {...signUpForm.register('email', { required: true })}
                    disabled={isLoading}
                  />
                  {getDomainStatusMessage()}
                </div>

                {emailDomainInfo.willBeAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-company">Company Name</Label>
                    <Input
                      id="signup-company"
                      placeholder="Enter your company name"
                      {...signUpForm.register('companyName')}
                      disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground">
                      Optional: If not provided, we'll use your email domain
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    {...signUpForm.register('password', { required: true, minLength: 6 })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    {...signUpForm.register('confirmPassword', { required: true })}
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
                      {emailDomainInfo.willBeAdmin ? 'Creating Company...' : 'Creating Account...'}
                    </>
                  ) : (
                    <>
                      {emailDomainInfo.willBeAdmin && <Crown className="mr-2 h-4 w-4" />}
                      {emailDomainInfo.willBeAdmin ? 'Create Company & Account' : 'Join Team'}
                    </>
                  )}
                </Button>

                {emailDomainInfo.willBeAdmin && (
                  <div className="text-center pt-2">
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      You'll become the company administrator
                    </Badge>
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}