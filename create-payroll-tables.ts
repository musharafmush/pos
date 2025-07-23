import Database from 'better-sqlite3';

const db = new Database('pos-data.db');

console.log('🔄 Creating payroll system tables...');

try {
  // Create employees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      hire_date DATE NOT NULL,
      department TEXT,
      position TEXT NOT NULL,
      employment_type TEXT CHECK(employment_type IN ('full_time', 'part_time', 'contract', 'intern')) DEFAULT 'full_time',
      status TEXT CHECK(status IN ('active', 'inactive', 'terminated')) DEFAULT 'active',
      address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      bank_account_number TEXT,
      bank_name TEXT,
      ifsc_code TEXT,
      pan_number TEXT,
      aadhar_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create salary_structures table
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      basic_salary DECIMAL(10,2) NOT NULL,
      hra DECIMAL(10,2) DEFAULT 0,
      da DECIMAL(10,2) DEFAULT 0,
      medical_allowance DECIMAL(10,2) DEFAULT 0,
      transport_allowance DECIMAL(10,2) DEFAULT 0,
      other_allowances DECIMAL(10,2) DEFAULT 0,
      pf_deduction DECIMAL(10,2) DEFAULT 0,
      esi_deduction DECIMAL(10,2) DEFAULT 0,
      tax_deduction DECIMAL(10,2) DEFAULT 0,
      other_deductions DECIMAL(10,2) DEFAULT 0,
      effective_from DATE NOT NULL,
      effective_to DATE,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  // Create attendance table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      check_in_time TIME,
      check_out_time TIME,
      break_start_time TIME,
      break_end_time TIME,
      total_hours DECIMAL(4,2),
      overtime_hours DECIMAL(4,2) DEFAULT 0,
      status TEXT CHECK(status IN ('present', 'absent', 'late', 'half_day', 'on_leave')) DEFAULT 'present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, date)
    )
  `);

  // Create leave_applications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT CHECK(leave_type IN ('casual', 'sick', 'annual', 'maternity', 'paternity', 'emergency', 'unpaid')) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
      approved_by INTEGER,
      approved_at DATETIME,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (approved_by) REFERENCES employees(id)
    )
  `);

  // Create employee_advances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      reason TEXT NOT NULL,
      request_date DATE NOT NULL,
      approval_date DATE,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'paid', 'recovered')) DEFAULT 'pending',
      approved_by INTEGER,
      recovery_start_month TEXT,
      monthly_recovery_amount DECIMAL(10,2),
      remaining_amount DECIMAL(10,2),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (approved_by) REFERENCES employees(id)
    )
  `);

  // Create payroll_records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      pay_period_start DATE NOT NULL,
      pay_period_end DATE NOT NULL,
      basic_salary DECIMAL(10,2) NOT NULL,
      allowances DECIMAL(10,2) DEFAULT 0,
      overtime_amount DECIMAL(10,2) DEFAULT 0,
      gross_salary DECIMAL(10,2) NOT NULL,
      deductions DECIMAL(10,2) DEFAULT 0,
      advance_recovery DECIMAL(10,2) DEFAULT 0,
      net_salary DECIMAL(10,2) NOT NULL,
      payment_date DATE,
      payment_method TEXT CHECK(payment_method IN ('bank_transfer', 'cash', 'cheque')) DEFAULT 'bank_transfer',
      payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
      bank_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  // Create payroll_settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      pay_frequency TEXT CHECK(pay_frequency IN ('monthly', 'bi_weekly', 'weekly')) DEFAULT 'monthly',
      working_days_per_month INTEGER DEFAULT 26,
      working_hours_per_day INTEGER DEFAULT 8,
      overtime_rate DECIMAL(5,2) DEFAULT 1.5,
      pf_rate DECIMAL(5,2) DEFAULT 12.0,
      esi_rate DECIMAL(5,2) DEFAULT 0.75,
      casual_leaves_per_year INTEGER DEFAULT 12,
      sick_leaves_per_year INTEGER DEFAULT 12,
      annual_leaves_per_year INTEGER DEFAULT 21,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ All payroll tables created successfully!');

  // Insert sample employees
  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      employee_id, first_name, last_name, email, phone, hire_date, 
      department, position, employment_type, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const employees = [
    ['EMP001', 'Rajesh', 'Kumar', 'rajesh@company.com', '9876543210', '2024-01-15', 'Sales', 'Sales Executive', 'full_time', 'active'],
    ['EMP002', 'Priya', 'Sharma', 'priya@company.com', '9876543211', '2024-02-01', 'Accounts', 'Accountant', 'full_time', 'active'],
    ['EMP003', 'Amit', 'Singh', 'amit@company.com', '9876543212', '2024-03-10', 'Operations', 'Store Manager', 'full_time', 'active']
  ];

  employees.forEach(emp => {
    insertEmployee.run(...emp);
  });

  // Insert sample salary structures
  const insertSalary = db.prepare(`
    INSERT INTO salary_structures (
      employee_id, basic_salary, hra, da, medical_allowance, 
      transport_allowance, pf_deduction, esi_deduction, effective_from
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const salaries = [
    [1, 25000, 5000, 2000, 1500, 2000, 3000, 188, '2024-01-15'],
    [2, 30000, 6000, 2500, 1500, 2000, 3600, 225, '2024-02-01'],
    [3, 35000, 7000, 3000, 1500, 2500, 4200, 263, '2024-03-10']
  ];

  salaries.forEach(sal => {
    insertSalary.run(...sal);
  });

  // Insert sample payroll settings
  db.exec(`
    INSERT OR REPLACE INTO payroll_settings (
      id, company_name, pay_frequency, working_days_per_month, 
      working_hours_per_day, overtime_rate, pf_rate, esi_rate
    ) VALUES (
      1, 'Awesome Shop POS', 'monthly', 26, 8, 1.5, 12.0, 0.75
    )
  `);

  console.log('✅ Sample payroll data inserted successfully!');
  console.log('🎉 Payroll system is now ready to use!');

} catch (error) {
  console.error('❌ Error creating payroll tables:', error);
} finally {
  db.close();
}