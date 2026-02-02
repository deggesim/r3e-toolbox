import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Container, Row, Col, Nav } from "react-bootstrap";
import "./Layout.css";
import logoUrl from "/logo.png";

interface LayoutProps {
  readonly children: ReactNode;
}

interface MenuItemData {
  path: string;
  label: string;
  icon: string;
}

const menuItems: MenuItemData[] = [
  { path: "/ai-management", label: "AI Management", icon: "🤖" },
  { path: "/fix-qualy-times", label: "Fix Qualy Times", icon: "⏱️" },
  {
    path: "/build-results-database",
    label: "Build Results Database",
    icon: "💾",
  },
  {
    path: "/results-database",
    label: "Results Database Viewer",
    icon: "📊",
  },
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        <Col xs={12} md={3} className="bg-dark border-end border-secondary sidebar-col">
          <div className="sidebar">
            <div className="sidebar-header border-bottom border-secondary text-center">
              <img
                src={logoUrl}
                alt="R3E Toolbox"
                className="sidebar-logo"
              />
              <h1 className="h5 mb-2 mt-2 text-gradient">R3E Toolbox</h1>
            </div>
            <Nav className="flex-column p-2">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `menu-item d-flex align-items-center gap-2 rounded text-decoration-none ${
                      isActive ? "active" : ""
                    }`
                  }
                >
                  <span className="menu-icon fs-5">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                </NavLink>
              ))}
            </Nav>
          </div>
        </Col>
        <Col xs={12} md={9} className="main-content-col">
          <div className="main-content p-4">{children}</div>
        </Col>
      </Row>
    </Container>
  );
}
