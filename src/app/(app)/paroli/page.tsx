import { KeyRound } from "lucide-react";
import { getCredentials } from "@/lib/vault-queries";
import { VaultList, NewCredentialButton } from "@/components/app/vault-items";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Пароли" };
export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const credentials = await getCredentials();

  return (
    <div>
      <PageHeader
        title="Пароли"
        subtitle="Зашифрованное хранилище: логины и пароли под твоим паролем входа."
        actions={<NewCredentialButton />}
      />

      {credentials.length > 0 ? (
        <VaultList credentials={credentials} />
      ) : (
        <EmptyState
          icon={<KeyRound size={22} />}
          title="Пока пусто"
          description="Храни здесь логины и пароли. Пароль шифруется (AES-256), и в бэкапах лежит зашифрованным — утёкший файл базы без ключа сервера бесполезен."
          action={<NewCredentialButton />}
        />
      )}
    </div>
  );
}
