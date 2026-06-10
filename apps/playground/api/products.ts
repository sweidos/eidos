const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Audio', stock: 42 },
  { id: 2, name: 'Mechanical Keyboard', price: 149.99, category: 'Input', stock: 17 },
  { id: 3, name: 'USB-C Hub (7-in-1)', price: 49.99, category: 'Connectivity', stock: 89 },
  { id: 4, name: 'Webcam 4K', price: 129.99, category: 'Video', stock: 5 },
  { id: 5, name: 'Desk Mat XL', price: 34.99, category: 'Accessories', stock: 200 },
];

export function GET() {
  return Response.json(PRODUCTS, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
