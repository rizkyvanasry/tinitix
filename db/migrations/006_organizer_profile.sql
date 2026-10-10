ALTER TABLE users ADD COLUMN first_name text;
ALTER TABLE users ADD COLUMN last_name text;
ALTER TABLE users ADD COLUMN phone text;
ALTER TABLE users ADD COLUMN birth_date date;
ALTER TABLE users ADD COLUMN gender text CHECK (gender IN ('male','female'));
