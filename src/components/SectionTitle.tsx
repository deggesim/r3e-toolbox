const SectionTitle = ({ label }: { readonly label: string }) => {
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
      <div
        style={{ width: 6, height: 28, background: "#646cff" }}
        aria-hidden
      />
      <h3 className="h5 m-0 text-uppercase text-white-50">{label}</h3>
    </div>
  );
};

export default SectionTitle;
