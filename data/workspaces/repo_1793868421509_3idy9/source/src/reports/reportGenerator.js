// Report Generator Module
export class ReportGenerator {
  generateCsvRollup(records) {
    if (!Array.isArray(records)) {
      throw new Error('InvalidRecordsException: records must be an array');
    }
    const header = 'id,amount,status,timestamp\n';
    const rows = records.map((r) => `${r.id},${r.amount},${r.status},${r.timestamp}`).join('\n');
    return header + rows;
  }
}
