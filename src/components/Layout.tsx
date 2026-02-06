import type { PropsWithChildren } from "react";
import { Col, Container, Nav, Row } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import "./Layout.css";
import logoUrl from "/logo.png";

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

const Layout = ({ children }: PropsWithChildren<{}>) => {
  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        <Col
          xs={12}
          md={3}
          className="bg-dark border-end border-secondary sidebar-col"
        >
          <div className="sidebar">
            <div className="sidebar-header border-bottom border-secondary text-center">
              <img src={logoUrl} alt="R3E Toolbox" className="sidebar-logo" />
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
          <div className="main-content">{children}</div>
        </Col>
      </Row>
    </Container>
  );
};

export default Layout;
