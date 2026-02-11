import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PaginationControls from '@/app/admin/orders/components/PaginationControls';

describe('PaginationControls Component', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('should render pagination information correctly', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const showingText = screen.getAllByText((content, element) => {
      return element?.textContent === 'Showing 1 to 50 of 225 results';
    });
    expect(showingText.length).toBeGreaterThan(0);
  });

  it('should disable first and previous buttons on first page', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const firstButton = screen.getByLabelText('First page');
    const previousButton = screen.getByLabelText('Previous page');

    expect(firstButton).toBeDisabled();
    expect(previousButton).toBeDisabled();
  });

  it('should disable next and last buttons on last page', () => {
    render(
      <PaginationControls
        currentPage={5}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const nextButton = screen.getByLabelText('Next page');
    const lastButton = screen.getByLabelText('Last page');

    expect(nextButton).toBeDisabled();
    expect(lastButton).toBeDisabled();
  });

  it('should call onPageChange when next button is clicked', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const nextButton = screen.getByLabelText('Next page');
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange when previous button is clicked', () => {
    render(
      <PaginationControls
        currentPage={3}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const previousButton = screen.getByLabelText('Previous page');
    fireEvent.click(previousButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when first button is clicked', () => {
    render(
      <PaginationControls
        currentPage={3}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const firstButton = screen.getByLabelText('First page');
    fireEvent.click(firstButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when last button is clicked', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const lastButton = screen.getByLabelText('Last page');
    fireEvent.click(lastButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(5);
  });

  it('should call onPageChange when a page number is clicked', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const pageButton = screen.getByRole('button', { name: '3' });
    fireEvent.click(pageButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should not render when totalItems is 0', () => {
    const { container } = render(
      <PaginationControls
        currentPage={1}
        totalPages={0}
        pageSize={50}
        totalItems={0}
        onPageChange={mockOnPageChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should calculate start and end items correctly', () => {
    render(
      <PaginationControls
        currentPage={3}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const showingText = screen.getAllByText((content, element) => {
      return element?.textContent === 'Showing 101 to 150 of 225 results';
    });
    expect(showingText.length).toBeGreaterThan(0);
  });

  it('should show ellipsis for large page counts', () => {
    render(
      <PaginationControls
        currentPage={5}
        totalPages={20}
        pageSize={50}
        totalItems={1000}
        onPageChange={mockOnPageChange}
      />
    );

    const ellipsis = screen.getAllByText('...');
    expect(ellipsis.length).toBeGreaterThan(0);
  });

  it('should highlight current page', () => {
    render(
      <PaginationControls
        currentPage={3}
        totalPages={5}
        pageSize={50}
        totalItems={225}
        onPageChange={mockOnPageChange}
      />
    );

    const currentPageButton = screen.getByRole('button', { name: '3', current: 'page' });
    expect(currentPageButton).toHaveClass('bg-blue-600');
  });
});
