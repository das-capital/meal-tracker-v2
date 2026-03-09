export interface OFFProduct {
    barcode: string;
    name: string;
    brand: string;
    per100kcal: number;
    per100protein: number;
    per100fat: number;
    per100carbs: number;
    per100fiber: number;
}

export type OFFResult =
    | { found: true; product: OFFProduct }
    | { found: false; reason: 'not_found' | 'no_nutrition' | 'network_error' };

export async function fetchByBarcode(barcode: string): Promise<OFFResult> {
    let response: Response;
    try {
        response = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${barcode}` +
            `?fields=product_name,brands,nutriments`
        );
    } catch {
        return { found: false, reason: 'network_error' };
    }
    if (!response.ok) return { found: false, reason: 'not_found' };
    const data = await response.json().catch(() => null);
    if (!data || data.status !== 1 || !data.product)
        return { found: false, reason: 'not_found' };
    const n = data.product.nutriments ?? {};
    const kcal = parseFloat(n['energy-kcal_100g'] ?? '0');
    if (!kcal && !n['proteins_100g']) return { found: false, reason: 'no_nutrition' };
    return {
        found: true,
        product: {
            barcode,
            name:          (data.product.product_name ?? '').trim(),
            brand:         (data.product.brands ?? '').trim(),
            per100kcal:    Math.round(kcal),
            per100protein: Math.round(parseFloat(n['proteins_100g'] ?? '0')),
            per100fat:     Math.round(parseFloat(n['fat_100g'] ?? '0')),
            per100carbs:   Math.round(parseFloat(n['carbohydrates_100g'] ?? '0')),
            per100fiber:   Math.round(parseFloat(n['fiber_100g'] ?? '0')),
        },
    };
}
