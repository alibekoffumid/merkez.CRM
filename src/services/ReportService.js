import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { robotoBase64 } from './FontData';

export const ReportService = {
  generateFinancialReport: (data, dateRange, businessInfo, labels) => {
    try {
      const doc = new jsPDF();
      
      // 0. Register & Set Unicode Font (Roboto)
      // This is crucial for RU and AZ (letter 'ə') support.
      doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');

      const { totalIncome = 0, totalExpenses = 0, totalSalaries = 0, netProfit = 0, items = [] } = data;
      const { businessName = 'Merkez CRM Member', address = '' } = businessInfo;

      const t = labels || {
        title: businessName,
        period: 'Period',
        generated: 'Generated',
        summaryTitle: 'FINANCIAL SUMMARY',
        income: 'Total Income',
        expenses: 'Total Expenses',
        salaries: 'Total Salaries',
        netProfit: 'NET PROFIT',
        thDate: 'Date',
        thCategory: 'Category',
        thDesc: 'Description',
        thAmount: 'Amount',
        currencySymbol: '$'
      };

      // 1. Header & Branding
      doc.setFontSize(22);
      doc.setTextColor(66, 133, 244); 
      doc.text(String(t.title), 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(String(address), 14, 30);
      doc.text(`${t.period}: ${dateRange || 'N/A'}`, 14, 35);
      doc.text(`${t.generated}: ${new Date().toLocaleString()}`, 14, 40);

      // 2. Financial Summary Cards
      doc.setDrawColor(240);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, 50, 180, 40, 3, 3, 'FD');

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont('Roboto', 'bold');
      doc.text(String(t.summaryTitle), 20, 60);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(10);
      doc.text(`${t.income}: ${t.currencySymbol}${Number(totalIncome).toFixed(2)}`, 20, 70);
      doc.text(`${t.expenses}: ${t.currencySymbol}${Number(totalExpenses).toFixed(2)}`, 20, 75);
      doc.text(`${t.salaries}: ${t.currencySymbol}${Number(totalSalaries).toFixed(2)}`, 20, 80);
      
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(netProfit >= 0 ? 52 : 234, netProfit >= 0 ? 168 : 67, netProfit >= 0 ? 83 : 53); 
      doc.text(`${t.netProfit}: ${t.currencySymbol}${Number(netProfit).toFixed(2)}`, 20, 88);

      // 3. Detailed Transactions Table
      const tableData = items.map(item => [
        item.date || 'N/A',
        item.category || 'N/A',
        item.description || 'N/A',
        item.type === 'income' 
          ? `+ ${t.currencySymbol}${Number(item.amount || 0).toFixed(2)}` 
          : `- ${t.currencySymbol}${Number(item.amount || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 100,
        head: [[t.thDate, t.thCategory, t.thDesc, t.thAmount]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 133, 244], textColor: 255, font: 'Roboto', fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { font: 'Roboto' },
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
      return false;
    }
  }
};
