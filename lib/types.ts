export type Category = { id:string; name:string; price:number; quota:number; people:number; starts:string; ends:string };
export type Event = { id:string; organizationId:string; slug:string; name:string; kind:'Konser'|'Party'; city:string; venue:string; address:string; starts:string; ends:string; timezone:string; status:'draft'|'published'|'closed'|'cancelled'; capacity:number; maxPeople:number; poster:string; banner?:string; theme:string; eyebrow:string; lineup:string[]; description:string; terms:string; categories:Category[] };
export type PublicCategory = Category & { available:number; state:'available'|'soon'|'soldout'|'ended' };
export type PublicEvent = Omit<Event,'categories'> & {categories:PublicCategory[]; startingPrice:number|null; startingPeople:number; saleState:string};
export type User = {id:string;email:string;name:string;role:'admin'|'staff'|'buyer';organizationId:string;verified:boolean};
export type OrderItem = {id:string;categoryId:string;name:string;price:number;quantity:number;people:number};
export type OrderView = {id:string;status:string;buyerName:string;buyerEmail:string;items:OrderItem[];total:number;people:number;expiresAt:string;createdAt:string;event:PublicEvent;tickets:{id:string;name:string;categoryName:string;status:string;checkedInAt:string|null;qr:string}[];emailStatus:string;paymentUrl?:string};
