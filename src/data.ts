import { addDays } from 'date-fns';

export const initialReverts = [
  { 
    id: '1001', 
    serialNumber: 'AAI-COT-23-0001',
    createdAt: '2023-11-10T08:00:00.000Z',
    name: 'John Doe', 
    birthdate: '1995-05-15', 
    gender: 'Male', 
    ethnicity: 'Caucasian',
    civilStatus: 'Single',
    completeAddress: '123 Main St, Cotabato City',
    contactNumber: '09123456789',
    facebookAccount: 'john.doe',
    emailAddress: 'john@example.com',
    educationalBackground: 'College Graduate',
    profession: 'Software Engineer',
    muslimName: 'Yahya Doe',
    previousReligion: 'Christianity', 
    daeyahName: 'Ustadz Ahmad',
    islamicCenter: 'Masjid Al-Taqwa',
    witness1: 'Abdullah Smith',
    witness2: 'Omar Khan',
    witness3: '',
    reversionDate: '2023-11-10', 
    status: 'Active' 
  },
];

export const initialEvents = [
  { id: 1, title: 'Mentorship Session', start: new Date(), end: addDays(new Date(), 0), type: 'meeting', allDay: false },
  { id: 2, title: 'Community Dinner', start: addDays(new Date(), 2), end: addDays(new Date(), 2), type: 'event', allDay: false },
  { 
    id: 3, 
    title: 'Basics of Prayer', 
    start: addDays(new Date(), -3), 
    end: addDays(new Date(), -3), 
    type: 'class', 
    allDay: false,
    isRecurring: true,
    recurrence: {
      frequency: 'weekly',
      interval: '1',
      endCondition: 'never',
      count: '10'
    }
  },
  { 
    id: 4, 
    title: 'Friday Sermon', 
    start: addDays(new Date(), -1), 
    end: addDays(new Date(), -1), 
    type: 'class', 
    allDay: false,
    isRecurring: true,
    recurrence: {
      frequency: 'weekly',
      interval: '1',
      endCondition: 'never'
    }
  },
];

export const initialMembers: any[] = [
  { id: 'staff_123', name: 'Brother Ali', role: 'Staff', type: 'Staff', department: 'Admin', phone: '0900 000 0000', joinDate: "2023-08-01", email: 'ali@example.com' },
  { id: '1', name: 'Ahmad Abdullah', role: 'President', type: 'Officer', phone: '0917 123 4567', joinDate: "2023-08-01", email: 'ahmad@example.com' },
  { id: '2', name: 'Khalid Usman', role: 'Vice President', type: 'Officer', phone: '0922 678 9012', joinDate: "2023-08-01", email: 'khalid@example.com' },
  { id: '3', name: 'Zainab Musa', role: 'Secretary', type: 'Officer', phone: '0915 111 2222', joinDate: "2023-08-01", email: 'zainab@example.com' },
  { id: '4', name: 'Fatima Reyes', role: 'Center Director', type: 'Staff', department: 'Admin', phone: '0918 234 5678', joinDate: "2023-08-01", email: 'fatima@example.com' },
  { id: '5', name: 'Omar Hassan', role: 'Imam', type: 'Staff', department: 'Da\'wah', phone: '0919 345 6789', joinDate: "2023-08-01", email: 'omar@example.com' },
  { id: '6', name: 'Aisha Santos', role: 'Admin', type: 'Staff', department: 'Admin', phone: '0920 456 7890', joinDate: "2023-08-01", email: 'aisha@example.com' },
  { id: '7', name: 'Zaid Ibrahim', role: 'Da\'eyah', type: 'Volunteer', phone: '0921 567 8901', joinDate: "2023-08-01", email: 'zaid@example.com' },
  { id: '8', name: 'Mariam Ali', role: 'Event Coordinator', type: 'Volunteer', phone: '0933 444 5555', joinDate: "2023-08-01", email: 'mariam@example.com' },
  { id: '9', name: 'Yusuf Tariq', role: 'General Volunteer', type: 'Volunteer', phone: '0944 555 6666', joinDate: "2023-08-01", email: 'yusuf@example.com' },
];

export const mockTasks = [
  { id: 't4', title: 'Prepare welcome kits', description: 'Assemble new member welcome kits for the upcoming orientation.', priority: 'Medium', status: 'in-progress', assignee: 'staff_123', department: 'Admin' },
  { id: 't1', title: 'Prepare Friday Khutbah audio', description: 'Test the microphones and sound system for Jumuah.', priority: 'High', status: 'todo', assignee: '5', department: 'Admin' },
  { id: 't2', title: 'Clean prayer hall carpets', description: 'Vacuum all carpets in the main and secondary halls.', priority: 'Medium', status: 'todo', assignee: '6', department: 'Admin' },
  { id: 't3', title: 'Organize Iftar logistics', description: 'Contact vendors for dates and water for community iftar.', priority: 'High', status: 'in-progress', assignee: '8', department: "Da'wah" }
];

export const mockCampaigns = [
  { id: '1', title: 'Zakat Fund', description: 'Annual Zakat collection for distribution to the needy in the community.', goalAmount: 100000, category: 'Zakat' },
  { id: '2', title: 'General Center Fund', description: 'Operations and maintenance of the Islamic Center facilities.', goalAmount: 50000, category: 'General' },
  { id: '3', title: 'Ramadan Iftar', description: 'Sponsor Iftar meals during the holy month of Ramadan.', goalAmount: 30000, category: 'Ramadan' },
];

export const mockDonations = [
  { id: 'd1', date: '2026-08-30', donorName: 'Ahmad Abdullah', amount: 5000, category: 'Zakat', campaignId: '1' },
  { id: 'd2', date: '2026-08-28', donorName: 'Anonymous', amount: 1500, category: 'Sadaqah', campaignId: '2' },
  { id: 'd3', date: '2026-08-25', donorName: 'Fatima Reyes', amount: 3000, category: 'Zakat', campaignId: '1' },
  { id: 'd4', date: '2026-08-20', donorName: 'Anonymous', amount: 500, category: 'Sadaqah', campaignId: '3' },
];

export const initialLeaves = [
  {
    id: 'l1',
    employeeId: 'staff_123',
    employeeName: 'Brother Ali',
    idNo: 'EMP-001',
    position: 'Staff',
    department: 'Admin',
    contactNo: '0900 000 0000',
    mailingAddress: 'Cotabato City',
    startDate: '2026-09-15',
    returnDate: '2026-09-20',
    leaveType: 'Vacation Leave',
    approval: { finance: 'Pending', director: 'Pending' },
    remarks: '',
    dateFiled: '2026-09-10'
  },
  {
    id: 'l2',
    employeeId: '6',
    employeeName: 'Aisha Santos',
    idNo: 'EMP-006',
    position: 'Admin',
    department: 'Admin',
    contactNo: '0920 456 7890',
    mailingAddress: 'Cotabato City',
    startDate: '2026-10-01',
    returnDate: '2026-10-05',
    leaveType: 'Sick Leave',
    approval: { finance: 'Approved', director: 'Approved' },
    remarks: 'Approved by HR.',
    dateFiled: '2026-09-08'
  }
];
