export interface MockStudent {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  year: '1' | '2' | '3' | '4';
  branch: 'CSE' | 'ECE' | 'EEE' | 'ME' | 'CIVIL';
  section: 'A' | 'B' | 'C';
  status: 'Active' | 'Inactive';
}

export const mockStudents: MockStudent[] = [
  {
    id: 'std-1',
    name: 'Alex Johnson',
    email: 'student@classsync.com',
    roll_number: '22CS101',
    year: '2',
    branch: 'CSE',
    section: 'A',
    status: 'Active',
  },
  {
    id: 'std-2',
    name: 'Priya Sharma',
    email: 'priya.sharma@classsync.com',
    roll_number: '22CS102',
    year: '2',
    branch: 'CSE',
    section: 'A',
    status: 'Active',
  },
  {
    id: 'std-3',
    name: 'Rahul Varma',
    email: 'rahul.varma@classsync.com',
    roll_number: '22CS103',
    year: '2',
    branch: 'CSE',
    section: 'B',
    status: 'Active',
  },
  {
    id: 'std-4',
    name: 'Sara Khan',
    email: 'sara.khan@classsync.com',
    roll_number: '21CS045',
    year: '3',
    branch: 'CSE',
    section: 'A',
    status: 'Active',
  },
  {
    id: 'std-5',
    name: 'David Miller',
    email: 'david.m@classsync.com',
    roll_number: '20CS012',
    year: '4',
    branch: 'CSE',
    section: 'A',
    status: 'Active',
  },
  {
    id: 'std-6',
    name: 'Ananya Reddy',
    email: 'ananya.r@classsync.com',
    roll_number: '23EC022',
    year: '1',
    branch: 'ECE',
    section: 'A',
    status: 'Active',
  },
];
