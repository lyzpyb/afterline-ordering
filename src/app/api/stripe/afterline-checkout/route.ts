import {
  createAfterLineCheckout,
  createAfterLineCheckoutOptions,
} from "@/lib/afterline-checkout";

export async function OPTIONS(req: Request) {
  return createAfterLineCheckoutOptions(req);
}

export async function POST(req: Request) {
  return createAfterLineCheckout(req);
}
