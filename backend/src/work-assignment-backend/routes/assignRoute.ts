import { Request, Response } from 'express';

export const handleAssignTask = async (req: Request, res: Response) => {
  const { workerName, itemWeight, itemPurity, mode, invoiceId } = req.body;

  if (!workerName || !itemWeight || !itemPurity || !mode) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: workerName, itemWeight, itemPurity, and mode are all required.',
    });
  }

  console.log(`🔨 Work Assignment Created:
   - Worker: ${workerName}
   - Weight: ${itemWeight}g
   - Purity: ${itemPurity}%
   - Mode: ${mode}
   - Reference Invoice ID: ${invoiceId || 'N/A'}`);

  return res.json({
    success: true,
    message: `Successfully assigned task to ${workerName} with ${itemWeight}g at ${itemPurity}% purity (Mode: ${mode}).`,
    assignment: {
      workerName,
      itemWeight,
      itemPurity,
      mode,
      invoiceId: invoiceId || null,
      assignedAt: new Date().toISOString(),
    }
  });
};

export default handleAssignTask;
