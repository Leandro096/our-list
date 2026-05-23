import { useTranslation } from "@/locales";

interface GuestDetailProps {
  guest: {
    id: string;
    invitation_guid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    status: "pending" | "confirmed" | "declined" | "tentative";
    dietary_restrictions: string | null;
    notes: string | null;
    is_plus_one: boolean;
    created_at: string;
    updated_at: string;
  };
}

export function GuestConfirmation({ guest }: GuestDetailProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">
        {t("guest.confirmationTitle")}
      </h1>
      <p className="text-lg">
        {t("guest.confirmationMessage", {
          name: `${guest.first_name} ${guest.last_name}`,
        })}
      </p>
    </div>
  );
}
