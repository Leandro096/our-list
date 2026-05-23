"use client";

import {
  Label,
  Input,
  Select,
  Card,
  Button,
  Textarea,
  Checkbox,
  CardTitle,
  SelectItem,
  CardHeader,
  CardContent,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Guest } from "@/lib";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createGuest, updateGuest } from "@/services";

interface GuestFormProps {
  categories: Category[];
  guest?: Guest & { guest_categories?: { category_id: string }[] };
  mode?: "create" | "edit";
}

export function GuestForm({
  categories,
  guest,
  mode = "create",
}: GuestFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: guest?.first_name || "",
    last_name: guest?.last_name || "",
    email: guest?.email || "",
    phone: guest?.phone || "",
    status: guest?.status || "pending",
    dietary_restrictions: guest?.dietary_restrictions || "",
    notes: guest?.notes || "",
    is_plus_one: guest?.is_plus_one || false,
    selectedCategories:
      guest?.guest_categories?.map((gc) => gc.category_id) || [],
    ceremony_attending: true,
    reception_attending: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[GuestForm] handleSubmit called, mode:", mode);
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "create") {
        console.log("[GuestForm] calling createGuest...");
        await createGuest(supabase, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status as Guest["status"],
          dietary_restrictions: formData.dietary_restrictions,
          notes: formData.notes,
          is_plus_one: formData.is_plus_one,
          selectedCategories: formData.selectedCategories,
          ceremony_attending: formData.ceremony_attending,
          reception_attending: formData.reception_attending,
        });
        console.log("[GuestForm] createGuest succeeded, navigating...");

        router.push("/dashboard/guests");
        router.refresh();
      } else {
        console.log("[GuestForm] calling updateGuest...");
        await updateGuest(supabase, guest!.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status as Guest["status"],
          dietary_restrictions: formData.dietary_restrictions,
          notes: formData.notes,
          is_plus_one: formData.is_plus_one,
          selectedCategories: formData.selectedCategories,
        });
        console.log("[GuestForm] updateGuest succeeded, navigating...");

        router.push(`/dashboard/guests/${guest!.id}`);
        router.refresh();
      }
    } catch (err) {
      console.error("[GuestForm] caught error:", err);
      setError(err instanceof Error ? err.message : JSON.stringify(err));
    } finally {
      console.log("[GuestForm] finally: setIsLoading(false)");
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter((id) => id !== categoryId)
        : [...prev.selectedCategories, categoryId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/dashboard/guests">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Guests
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                required
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                required
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RSVP Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as Guest["status"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_plus_one"
              checked={formData.is_plus_one}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_plus_one: !!checked })
              }
            />
            <Label htmlFor="is_plus_one" className="font-normal">
              This guest is a plus one
            </Label>
          </div>

          {mode === "create" && (
            <div className="space-y-3">
              <Label>Events</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ceremony"
                    checked={formData.ceremony_attending}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        ceremony_attending: !!checked,
                      })
                    }
                  />
                  <Label htmlFor="ceremony" className="font-normal">
                    Ceremony
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reception"
                    checked={formData.reception_attending}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        reception_attending: !!checked,
                      })
                    }
                  />
                  <Label htmlFor="reception" className="font-normal">
                    Reception
                  </Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  formData.selectedCategories.includes(category.id)
                    ? "text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                style={{
                  backgroundColor: formData.selectedCategories.includes(
                    category.id,
                  )
                    ? category.color
                    : undefined,
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
            <Input
              id="dietary_restrictions"
              value={formData.dietary_restrictions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dietary_restrictions: e.target.value,
                })
              }
              placeholder="e.g., Vegetarian, Gluten-free"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional notes about this guest"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Add Guest" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/guests">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
