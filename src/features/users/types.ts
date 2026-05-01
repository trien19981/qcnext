export type User = {
  id: string;
  name: string;
  email: string;
};

export type ListUsersResponse = {
  items: User[];
  total: number;
};

export type CreateUserBody = {
  name: string;
  email: string;
};

export type UpdateUserBody = Partial<CreateUserBody>;

