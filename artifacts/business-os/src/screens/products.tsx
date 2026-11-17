import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader, SearchField } from "@/components/app-shell";
import { SavedViewControls } from "@/components/saved-view-controls";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Select, Segmented } from "@/components/ui";
import { UNITS, type Product } from "@/lib/domain";
import { downloadCsv } from "@/lib/csv";
import { money } from "@/lib/format";
import { generateSku } from "@/lib/sku";
import { archiveProduct, upsertProduct } from "@/lib/services";
import { fileToDataUrl } from "@/lib/theme";
import { useAppStore, useBusiness } from "@/lib/store";
import { Thumb } from "@/screens/sell";

type SortKey = "name" | "stock" | "price";

export function ProductsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("name");
  const [editing, setEditing] = React.useState<Partial<Product> | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [productFilter, setProductFilter] = React.useState<"active" | "archived" | "all">("active");

  if (!business) return null;
  const products = db.products.filter((p) => p.businessId === business.id);
  const categories = Array.from(new Set(products.filter((p) => !p.archived).map((p) => p.category).filter(Boolean))) as string[];
  const visibleProducts = products.filter((p) =>
    productFilter === "all" || (productFilter === "archived" ? p.archived : !p.archived)
  );
  let list = visibleProducts.filter((p) => {
    const s = q.toLowerCase();
    const matchesQ = !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.barcode?.includes(s);
    const matchesC = category === "all" || p.category === category;
    return matchesQ && matchesC;
  });
  list = [...list].sort((a, b) => {
    if (sort === "stock") return a.stock - b.stock;
    if (sort === "price") return b.sellingPrice - a.sellingPrice;
    return a.name.localeCompare(b.name);
  });

  function exportProducts() {
    downloadCsv("business-sutra-products.csv",
      ["Name", "SKU", "Barcode", "Category", "Cost price", "Selling price", "Stock", "Minimum stock", "Unit"],
      list.map((product) => [product.name, product.sku, product.barcode, product.category, product.costPrice, product.sellingPrice, product.stock, product.minStock, product.unit]));
    toast.success("Exported " + list.length + " products");
  }

  return (
    <AppPage>
      <PageHeader
        title="Products"
        subtitle={`${products.filter((product) => !product.archived).length} active products · ${products.filter((product) => product.archived).length} archived`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={exportProducts} disabled={!list.length}><Download className="size-4" />Export</Button>
            <Button size="sm" onClick={() => setEditing({ businessId: business.id, unit: "pcs", stock: 0, minStock: 0, costPrice: 0, sellingPrice: 0, name: "", sku: "" })}>Add</Button>
          </div>
        }
      />
      <SearchField value={q} onChange={setQ} placeholder="Search products" />
      <SavedViewControls businessId={business.id} moduleKey="products" filters={{ q, category, sort }} onApply={(saved) => {
        setQ(saved.q ?? "");
        setCategory(saved.category ?? "all");
        setSort((saved.sort as SortKey) ?? "name");
      }} />
      <div className="mb-3">
        <Segmented value={productFilter} onChange={(value) => setProductFilter(value as typeof productFilter)} options={[
          { id: "active", label: "Active" },
          { id: "archived", label: "Archived" },
          { id: "all", label: "All" },
        ]} />
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-28">
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto min-w-28">
          <option value="name">Name</option>
          <option value="stock">Stock</option>
          <option value="price">Price</option>
        </Select>
      </div>
      {products.length === 0 ? (
        <EmptyState
          title="Add your products to start monitoring stock"
          body="Each product needs a name, price and opening stock. SKU can be generated for you."
          action={<Button onClick={() => setEditing({ businessId: business.id, unit: "pcs", stock: 0, minStock: 0, costPrice: 0, sellingPrice: 0, name: "", sku: "" })}>Add product</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState title="No products match" body="Clear search or pick another category." />
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" className="flex w-full items-center gap-3 rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left" onClick={() => setEditing(p)}>
                <Thumb src={p.imageDataUrl} label={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku}
                    {p.category ? ` · ${p.category}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-semibold">{money(p.sellingPrice, business.currency)}</p>
                  <Badge tone={p.stock <= 0 ? "bad" : p.stock <= p.minStock ? "warn" : "good"}>
                    {p.stock} {p.unit}
                  </Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <ProductForm
          product={editing}
          existingSkus={products.map((p) => p.sku)}
          currency={business.currency}
          onClose={() => setEditing(null)}
          onArchive={editing.id ? () => setConfirmId(editing.id!) : undefined}
          onSave={(input) => {
            try {
              const result = upsertProduct(useAppStore.getState().db, { ...input, businessId: business.id, id: editing.id });
              apply(result.db);
              toast.success(editing.id ? "Product updated" : "Product added");
              setEditing(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save");
            }
          }}
        />
      ) : null}
      <BottomSheet
        open={!!confirmId}
        onOpenChange={() => setConfirmId(null)}
        title={products.find((product) => product.id === confirmId)?.archived ? "Restore product?" : "Archive product?"}
        description="Archived products are hidden from checkout, inventory and new purchases. Existing sales, invoices and stock history remain intact."
        footer={
          <ConfirmBar
            confirmLabel={products.find((product) => product.id === confirmId)?.archived ? "Restore" : "Archive"}
            onCancel={() => setConfirmId(null)}
            onConfirm={() => {
              if (!confirmId) return;
              try {
                const target = products.find((product) => product.id === confirmId);
                apply(archiveProduct(useAppStore.getState().db, confirmId, !target?.archived));
                toast.success(target?.archived ? "Product restored" : "Product archived");
                setConfirmId(null);
                setEditing(null);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not update product");
              }
            }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">You can restore an archived product at any time.</p>
      </BottomSheet>
    </AppPage>
  );
}

function ProductForm({
  product,
  existingSkus,
  currency,
  onClose,
  onSave,
  onArchive,
}: {
  product: Partial<Product>;
  existingSkus: string[];
  currency: string;
  onClose: () => void;
  onSave: (p: {
    name: string;
    sku?: string;
    barcode?: string;
    category?: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    minStock: number;
    unit: string;
    imageDataUrl?: string;
  }) => void;
  onArchive?: () => void;
}) {
  const [name, setName] = React.useState(product.name ?? "");
  const [sku, setSku] = React.useState(product.sku ?? "");
  const [barcode, setBarcode] = React.useState(product.barcode ?? "");
  const [category, setCategory] = React.useState(product.category ?? "");
  const [cost, setCost] = React.useState(String(product.costPrice ?? 0));
  const [price, setPrice] = React.useState(String(product.sellingPrice ?? 0));
  const [stock, setStock] = React.useState(String(product.stock ?? 0));
  const [minStock, setMin] = React.useState(String(product.minStock ?? 0));
  const [unit, setUnit] = React.useState(product.unit ?? "pcs");
  const [image, setImage] = React.useState(product.imageDataUrl);

  return (
    <BottomSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={product.id ? "Edit product" : "New product"}
      footer={
        <div className="space-y-2">
          <Button className="w-full" onClick={() => onSave({
            name,
            sku,
            barcode,
            category,
            costPrice: Number(cost) || 0,
            sellingPrice: Number(price) || 0,
            stock: Number(stock) || 0,
            minStock: Number(minStock) || 0,
            unit,
            imageDataUrl: image,
          })}>
            Save product
          </Button>
          {onArchive ? (
            <Button variant="ghost" className="w-full" onClick={onArchive}>
              {product.archived ? "Restore product" : "Archive product"}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <Thumb src={image} label={name || "P"} />
          <span className="text-sm text-muted-foreground">Tap to add image</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setImage(await fileToDataUrl(f, 400));
            }}
          />
        </label>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="SKU">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
          <Button variant="secondary" className="mt-6" onClick={() => setSku(generateSku(name, existingSkus))}>
            Generate
          </Button>
        </div>
        <Field label="Barcode" hint="Camera and USB scanners will be wired here; SKU and keyboard wedge already work.">
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </Field>
        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Beverages" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Cost (${currency})`}>
            <Input type="number" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label={`Selling (${currency})`}>
            <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Stock" hint={product.id ? "Use Inventory to record reasoned stock movements." : "Opening stock is written to movement history."}>
            <Input type="number" inputMode="decimal" value={stock} disabled={Boolean(product.id)} onChange={(e) => setStock(e.target.value)} />
          </Field>
          <Field label="Minimum">
            <Input type="number" inputMode="decimal" value={minStock} onChange={(e) => setMin(e.target.value)} />
          </Field>
        </div>
        <Field label="Unit">
          <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </BottomSheet>
  );
}

