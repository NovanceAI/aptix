import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AreaRegistrationProps {
  onAreaCreated: (areaId: string) => void;
  clientId: string;
}

export function AreaRegistration({ onAreaCreated, clientId }: AreaRegistrationProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase
        .from("areas")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          client_id: clientId,
        })
        .select()
        .single();

      if (error) throw error;

      onAreaCreated(data.id);
    } catch (error: any) {
      console.error("Error creating area:", error);
      alert("Failed to create area: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Area</CardTitle>
        <CardDescription>
          Register a new area for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="area-name">Area Name</Label>
            <Input
              id="area-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter area name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="area-description">Description (Optional)</Label>
            <Textarea
              id="area-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this area"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create Area"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}