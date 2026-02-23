import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Login = () => {
  const { login, register, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const requestedMode = query.get('mode') === 'register' ? 'register' : 'login';

  const [activeTab, setActiveTab] = React.useState<'login' | 'register'>(requestedMode);
  const [isLoading, setIsLoading] = React.useState(false);

  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');

  const [registerName, setRegisterName] = React.useState('');
  const [registerEmail, setRegisterEmail] = React.useState('');
  const [registerPassword, setRegisterPassword] = React.useState('');

  React.useEffect(() => {
    setActiveTab(requestedMode);
  }, [requestedMode]);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await login(loginEmail, loginPassword);
      toast({
        title: 'Welcome back',
        description: 'You are signed in.',
      });
      navigate('/', { replace: true });
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Please check your credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await register(registerEmail, registerPassword, registerName);
      toast({
        title: 'Account created',
        description: 'You are now signed in.',
      });
      navigate('/', { replace: true });
    } catch (error) {
      toast({
        title: 'Create account failed',
        description: error instanceof Error ? error.message : 'Please check your details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
              <Trophy className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Tournament Maker</span>
          </Link>
          <Button variant="outline" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Start designing now!</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="register">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(event) => setLoginEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-sky-700 hover:bg-sky-800" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        value={registerName}
                        onChange={(event) => setRegisterName(event.target.value)}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerEmail}
                        onChange={(event) => setRegisterEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerPassword}
                        onChange={(event) => setRegisterPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-sky-700 hover:bg-sky-800" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <p className="mt-4 text-center text-xs text-slate-500">
                Demo auth: any email with <code>@</code> and password length 4+ works.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
