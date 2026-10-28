import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AppDataService } from '../../core/services/app-data.service';
import { BackendApiService } from '../../core/services/backend-api.service';

type Tab = 'suppliers' | 'pos';

@Component({
  selector: 'vx-supply-chain',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain.component.html',
})
export class SupplyChainComponent {
  tab = signal<Tab>('suppliers');
  suppliersLoading = signal(true);
  purchaseOrdersLoading = signal(true);

  readonly plantStages = [
    { icon: 'bi-bezier2', title: 'Press shop', make: 'Stamp body panels', buy: 'Steel and aluminum coil' },
    { icon: 'bi-tools', title: 'Body shop', make: 'Weld the body-in-white', buy: 'Fixtures and weld consumables' },
    { icon: 'bi-droplet-half', title: 'Paint shop', make: 'Pretreat, prime and paint', buy: 'Paint, sealers and chemicals' },
    { icon: 'bi-car-front', title: 'Final assembly', make: 'Install, connect and test', buy: 'Modules, powertrain and electronics' }
  ];

  readonly sourcingCategories = [
    { group: 'Raw material', examples: 'Steel coil, aluminum, paint', delivery: 'Scheduled bulk', buffer: 'Days to weeks', icon: 'bi-layers' },
    { group: 'Major modules', examples: 'Seats, cockpit, bumpers, glass', delivery: 'Just in sequence', buffer: 'Hours', icon: 'bi-box-seam' },
    { group: 'Powertrain', examples: 'Engines, transmissions, batteries', delivery: 'Spec matched', buffer: 'Hours to days', icon: 'bi-gear-wide-connected' },
    { group: 'Electronics', examples: 'Harnesses, ECUs, sensors', delivery: 'Scheduled; serialize critical parts', buffer: 'Days', icon: 'bi-cpu' },
    { group: 'Chassis', examples: 'Axles, brakes, wheels, tires', delivery: 'Just in time / sequence', buffer: 'Hours to days', icon: 'bi-truck' },
    { group: 'Standard parts', examples: 'Fasteners, clips, seals', delivery: 'Kanban or min/max', buffer: 'Days to weeks', icon: 'bi-nut' },
    { group: 'Indirect supplies', examples: 'Fluids, tools, spares, packaging', delivery: 'Replenish or request', buffer: 'Weeks / as needed', icon: 'bi-wrench-adjustable' }
  ];

  readonly loopStages = [
    { icon: 'bi-graph-up-arrow', label: 'Forecast', detail: 'Explode the build plan through the current BOM.' },
    { icon: 'bi-diagram-3', label: 'Source', detail: 'Approve suppliers, parts, terms and capacity.' },
    { icon: 'bi-file-earmark-text', label: 'Release', detail: 'Send purchase orders and firm call-offs.' },
    { icon: 'bi-broadcast', label: 'Ship notice', detail: 'Supplier sends ASN and shipment details.' },
    { icon: 'bi-box-arrow-in-down', label: 'Receive', detail: 'Count, scan and match the delivery.' },
    { icon: 'bi-shield-check', label: 'Inspect', detail: 'Accept into stock or quarantine the lot.' },
    { icon: 'bi-receipt', label: 'Three-way match', detail: 'Match order, receipt and invoice before payment.' },
    { icon: 'bi-arrow-repeat', label: 'Review', detail: 'Score performance and tune the next plan.' }
  ];

  readonly deliveryMethods = [
    { name: 'MRP', description: 'Explodes BOM demand, stock and open supply into dated requirements.', fit: 'Planned parts', icon: 'bi-calculator' },
    { name: 'Just in time', description: 'Frequent, smaller deliveries arrive close to consumption.', fit: 'Steady-volume parts', icon: 'bi-clock-history' },
    { name: 'Just in sequence', description: 'Supplier ships parts in the exact order of vehicles on the line.', fit: 'Variant-specific modules', icon: 'bi-list-ol' },
    { name: 'Kanban', description: 'A bin or scan signal triggers replenishment when stock is used.', fit: 'Common small parts', icon: 'bi-arrow-down-up' },
    { name: 'Min / max', description: 'Reorder at minimum and replenish to a defined maximum.', fit: 'Consumables and slow movers', icon: 'bi-sliders' },
    { name: 'Consignment', description: 'Supplier owns material at the plant until it is consumed.', fit: 'Fast-moving parts', icon: 'bi-box2-heart' }
  ];

  readonly receivingSteps = [
    'ASN lists shipment contents before the truck reaches the dock.',
    'Dock slot and arrival variance are recorded for delivery performance.',
    'Scan labels and match part, quantity and revision to the order.',
    'Inspect samples or critical lots; quarantine anything suspect.',
    'Put away to a location, line-side supermarket or direct feed.',
    'Deliver bins or sequenced racks to the station that needs them.',
    'Book consumption to the work order and VIN to trigger replenishment.',
    'Track returnable containers and cycle-count stock to correct drift.'
  ];

  readonly riskRows = [
    { risk: 'Single-source failure', impact: 'Line stops for a critical part', response: 'Second source, safety stock and supplier risk review' },
    { risk: 'Late or short shipment', impact: 'Station runs out of material', response: 'Track confirmed dates; escalate shortages early' },
    { risk: 'Wrong BOM revision', impact: 'Part does not fit or pass inspection', response: 'Tie order release to effective engineering revision' },
    { risk: 'Supplier quality escape', impact: 'Rework, warranty or recall exposure', response: 'Incoming checks, lot trace and containment' },
    { risk: 'Stock record drift', impact: 'False shortage or excess inventory', response: 'Scan transactions, cycle counts and reconciliation' },
    { risk: 'Demand or price change', impact: 'Excess stock or margin loss', response: 'Shorter forecast cycles and agreement price terms' }
  ];

  readonly systemNeeds = [
    { title: 'BOM-linked demand', detail: 'Part, quantity, model, variant and effective revision.', icon: 'bi-diagram-2' },
    { title: 'Supplier and agreements', detail: 'Approved sources, lead time, price, capacity and score.', icon: 'bi-building-check' },
    { title: 'Inventory and supply', detail: 'On-hand by location/lot, reservations and dated open orders.', icon: 'bi-boxes' },
    { title: 'Receiving and quality', detail: 'ASN, goods receipt, inspection result and quarantine state.', icon: 'bi-clipboard2-check' },
    { title: 'Consumption trace', detail: 'Work order and VIN links for critical lot or serial numbers.', icon: 'bi-upc-scan' },
    { title: 'Shortage signals', detail: 'Owner, need-by date, confirmed supply and next action.', icon: 'bi-bell' }
  ];

  constructor(public data: AppDataService, api: BackendApiService) {
    api.suppliers.list(0, 100).pipe(finalize(() => this.suppliersLoading.set(false))).subscribe(res => {
      data.suppliers = res.data.content.map((s: any) => ({ id: s.id, code: s.code, company: s.company, category: s.category ?? '', country: s.country ?? '', rating: s.rating ?? 0, status: s.status }));
    });
    api.purchaseOrders.list(0, 100).pipe(finalize(() => this.purchaseOrdersLoading.set(false))).subscribe(res => {
      data.purchaseOrders = res.data.content.map((po: any) => ({ id: po.poNumber, supplier: po.supplierCode, date: po.orderDate, total: po.totalAmount, status: po.status, items: po.items?.length ?? 0 }));
    });
  }

  statusColor(status: string) {
    if (status === 'RECEIVED' || status === 'APPROVED') return { background: '#e8f3ed', color: '#276447' };
    if (status === 'OPEN' || status === 'DRAFT') return { background: '#edf2f4', color: '#52656e' };
    return { background: '#fbf1df', color: '#8a5a20' };
  }
}
