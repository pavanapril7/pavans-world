'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminOrder } from './OrdersTable';
import { OrderFilters } from './OrderFilters';

interface ExportButtonProps {
  orders: AdminOrder[];
  filters: OrderFilters;
  disabled?: boolean;
}

export default function ExportButton({ orders, disabled = false }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format date for CSV (YYYY-MM-DD HH:MM:SS)
  const formatDateForCSV = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Format amount for CSV (without currency symbol, with 2 decimal places)
  const formatAmountForCSV = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toFixed(2);
  };

  // Escape CSV field (handle commas, quotes, newlines)
  const escapeCSVField = (field: string): string => {
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // Generate CSV content from orders
  const generateCSV = (): string => {
    // CSV Header
    const headers = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Vendor Name',
      'Status',
      'Total Amount',
      'Order Date',
      'Payment Status',
    ];

    // CSV Rows
    const rows = orders.map((order) => {
      const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
      const customerEmail = order.customer.email;
      const vendorName = order.vendor.businessName;
      const status = order.status;
      const totalAmount = formatAmountForCSV(order.total);
      const orderDate = formatDateForCSV(order.createdAt);
      const paymentStatus = order.payment?.status || 'N/A';

      return [
        escapeCSVField(order.orderNumber),
        escapeCSVField(customerName),
        escapeCSVField(customerEmail),
        escapeCSVField(vendorName),
        escapeCSVField(status),
        totalAmount,
        orderDate,
        escapeCSVField(paymentStatus),
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  };

  // Trigger file download
  const downloadCSV = (csvContent: string) => {
    // Create blob with UTF-8 BOM for proper Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `orders-export-${timestamp}.csv`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle export button click
  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      // Check if there are orders to export
      if (orders.length === 0) {
        setError('No orders to export. Please adjust your filters or wait for orders to be created.');
        return;
      }

      // Generate CSV
      const csvContent = generateCSV();

      // Download file
      downloadCSV(csvContent);

      // Clear error after successful export
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export orders. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleExport}
        disabled={disabled || exporting || orders.length === 0}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </>
        )}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}
    </div>
  );
}
