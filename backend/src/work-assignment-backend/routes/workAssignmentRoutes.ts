import { Router, Request, Response } from 'express';

const router = Router();

// Mock assignments data
const mockAssignments = [
  {
    id: 'WA-001',
    employee_name: 'Satish Chari',
    task_title: 'Polish & Stone Studding',
    jewelry_type: '22K Gold Haramu',
    weight_grams: 48.5,
    assigned_date: '2026-08-01',
    due_date: '2026-08-15',
    status: 'IN_PROGRESS',
  },
  {
    id: 'WA-002',
    employee_name: 'Ramesh Achari',
    task_title: 'Silver Vaddanam Casting',
    jewelry_type: 'Pure Silver Vaddanam',
    weight_grams: 350.0,
    assigned_date: '2026-08-05',
    due_date: '2026-08-12',
    status: 'PENDING',
  },
  {
    id: 'WA-003',
    employee_name: 'Krishna Swamy',
    task_title: 'Sizing & Laser Engraving',
    jewelry_type: 'Diamond Engagement Ring',
    weight_grams: 6.2,
    assigned_date: '2026-07-28',
    due_date: '2026-08-03',
    status: 'COMPLETED',
  },
  {
    id: 'WA-004',
    employee_name: 'Veera Chari',
    task_title: 'Custom Antique Gold Bangle Set',
    jewelry_type: '22K Gold Bangles',
    weight_grams: 32.8,
    assigned_date: '2026-07-20',
    due_date: '2026-08-01',
    status: 'OVERDUE',
  }
];

// Health Check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'online', service: 'Work Assignment Service' });
});

// Overview/Listing Endpoint
router.get('/overview', (req: Request, res: Response) => {
  res.json({
    success: true,
    assignments: mockAssignments,
    total: mockAssignments.length,
  });
});

import assignTaskHandler from './assignRoute';

router.post('/assign', assignTaskHandler);

export default router;
