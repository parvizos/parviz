import { notFound } from "next/navigation";
import {
  getPage,
  getPageBreadcrumbs,
  getChildPages,
  getBacklinks,
} from "@/lib/queries";
import { PageWorkspace } from "@/components/app/PageWorkspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPage(id);
  const label = p?.title || "Без названия";
  return { title: p ? `${p.icon ? p.icon + " " : ""}${label} · Блокнот` : "Блокнот" };
}

export default async function BloknotItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [page, breadcrumbs, subpages, backlinks] = await Promise.all([
    getPage(id),
    getPageBreadcrumbs(id),
    getChildPages(id),
    getBacklinks(id),
  ]);
  if (!page) notFound();

  return (
    <PageWorkspace
      page={{
        id: page.id,
        title: page.title,
        body: page.body,
        icon: page.icon,
        cover: page.cover,
        parentId: page.parentId,
      }}
      breadcrumbs={breadcrumbs}
      subpages={subpages}
      backlinks={backlinks}
    />
  );
}
