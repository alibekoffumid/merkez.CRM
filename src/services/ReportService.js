import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const ReportService = {
  generateFinancialReport: (data, dateRange, businessInfo) => {
    try {
      const doc = new jsPDF();
      const { totalIncome = 0, totalExpenses = 0, totalSalaries = 0, netProfit = 0, items = [] } = data;
      const { businessName = 'Merkez CRM Member', address = '' } = businessInfo;

      // 1. Header & Branding
      doc.setFontSize(22);
      doc.setTextColor(66, 133, 244); // Merkez Blue
      doc.text(String(businessName), 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(String(address), 14, 30);
      doc.text(`Period: ${dateRange || 'N/A'}`, 14, 35);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);

      // 2. Financial Summary Cards
      doc.setDrawColor(240);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, 50, 180, 40, 3, 3, 'FD');

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text('FINANCIAL SUMMARY', 20, 60);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Total Income: $${Number(totalIncome).toFixed(2)}`, 20, 70);
      doc.text(`Total Expenses: $${Number(totalExpenses).toFixed(2)}`, 20, 75);
      doc.text(`Total Salaries: $${Number(totalSalaries).toFixed(2)}`, 20, 80);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(netProfit >= 0 ? 52 : 234, netProfit >= 0 ? 168 : 67, netProfit >= 0 ? 83 : 53); // Green/Red
      doc.text(`NET PROFIT: $${Number(netProfit).toFixed(2)}`, 20, 88);

      // 3. Detailed Transactions Table
      const tableData = items.map(item => [
        item.date || 'N/A',
        item.category || 'N/A',
        item.description || 'N/A',
        item.type === 'income' 
          ? `+ $${Number(item.amount || 0).toFixed(2)}` 
          : `- $${Number(item.amount || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 100,
        head: [['Date', 'Category', 'Description', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 133, 244], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 100 }
      });

      // 4. Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} - Merkez CRM Automated Financial Report`, 14, doc.internal.pageSize.getHeight() - 10);
      }

      const safeDateRange = (dateRange || 'Report').replace(/ /g, '_').replace(/[\/\\]/g, '-');
      doc.save(`Financial_Report_${safeDateRange}.pdf`);
      return true;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating PDF: ' + error.message);
      return false;
    }
  }
};
