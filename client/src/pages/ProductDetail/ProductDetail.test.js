import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import rootReducer from "../../redux/reducers";
import { login } from "../../redux/actions/auth";
import bookApi from "../../api/bookApi";
import bookViewApi from "../../api/bookViewApi";
import ProductDetail from "./index";

jest.mock("../../api/bookApi", () => ({ getBySlug: jest.fn() }));
jest.mock("../../api/bookViewApi", () => ({
  hasConsent: jest.fn(),
  getConsentChoice: jest.fn(),
  hasAuthenticatedSession: jest.fn(),
  record: jest.fn(),
  setConsent: jest.fn(),
  deleteAnonymous: jest.fn(),
}));

function GoToBookB() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/book/book-b")}>Open book B</button>;
}

function renderDetail({ path = "/book/book-a", signedIn = true } = {}) {
  const store = createStore(rootReducer);
  if (signedIn) store.dispatch(login({ userId: "test-user", role: 0 }));
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <GoToBookB />
        <Routes>
          <Route path="/book/:slug" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  localStorage.clear();
  bookApi.getBySlug.mockImplementation(async (slug) => ({
    data: {
      _id: `id-${slug}`,
      slug,
      name: `Book ${slug}`,
      price: 100000,
      discount: 0,
      author: [],
      publisher: { name: "Test publisher" },
      imageUrl: "/book-cover-placeholder.svg",
    },
  }));
  bookViewApi.hasConsent.mockReturnValue(false);
  bookViewApi.getConsentChoice.mockReturnValue(null);
  bookViewApi.hasAuthenticatedSession.mockReturnValue(false);
  bookViewApi.record.mockRejectedValue(new Error("history service offline"));
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test("book details render when history recording fails and a new slug records a new view", async () => {
  renderDetail();
  expect(await screen.findByRole("heading", { name: "Book book-a" })).toBeInTheDocument();
  await waitFor(() => expect(bookViewApi.record).toHaveBeenCalledWith("id-book-a"));

  fireEvent.click(screen.getByRole("button", { name: "Open book B" }));
  expect(await screen.findByRole("heading", { name: "Book book-b" })).toBeInTheDocument();
  await waitFor(() => expect(bookViewApi.record).toHaveBeenCalledWith("id-book-b"));
});

test("a guest is not tracked until consent is given", async () => {
  renderDetail({ signedIn: false });
  expect(await screen.findByRole("heading", { name: "Book book-a" })).toBeInTheDocument();
  expect(await screen.findByText(/đồng ý lưu sách đã xem/i)).toBeInTheDocument();
  expect(bookViewApi.record).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Đồng ý trong phiên này" }));
  await waitFor(() => expect(bookViewApi.record).toHaveBeenCalledWith("id-book-a", true));
});
